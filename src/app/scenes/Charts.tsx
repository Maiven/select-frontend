import React from 'react';
import { connect } from 'react-redux';
import MediaQuery from 'react-responsive';
import { RouteComponentProps, withRouter } from 'react-router';
import { Link, LinkProps } from 'react-router-dom';
import { Dispatch } from 'redux';

import {
  ConnectedGridBookList,
  ConnectedPageHeader,
  HelmetWithTitle,
  Pagination,
} from 'app/components';
import { MAX_WIDTH, PageTitleText } from 'app/constants';
import { GridBookListSkeleton } from 'app/placeholder/BookListPlaceholder';

import { BookState } from 'app/services/book';
import { Actions, ChartCollectionState, COUNT_PER_PAGE } from 'app/services/collection';
import { getPageQuery } from 'app/services/routing/selectors';

import { RidiSelectState } from 'app/store';

interface CollectionStateProps {
  collection: ChartCollectionState;
  books: BookState;
  page: number;
  userGroup?: number;
}

interface CollectionDispatchProps {
  dispatchLoadCharts: (
    page: number,
    userGroup?: number,
  ) => ReturnType<typeof Actions.loadCollectionRequest>;
}
interface State {
  isInitialized: boolean;
}

type RouteProps = RouteComponentProps<{}>;
type Props = CollectionStateProps & CollectionDispatchProps & RouteProps;

export class Charts extends React.Component<Props> {
  private initialDispatchTimeout?: number | null;

  public state: State = {
    isInitialized: false,
  };

  private isFetched = (page: number) => {
    const { collection } = this.props;
    return (
      collection && collection.itemListByPage[page] && collection.itemListByPage[page].isFetched
    );
  };

  public componentDidMount() {
    this.initialDispatchTimeout = window.setTimeout(() => {
      const { dispatchLoadCharts, page, userGroup } = this.props;
      if (!this.isFetched(page)) {
        dispatchLoadCharts(page, userGroup);
      }

      this.initialDispatchTimeout = null;
      this.setState({ isInitialized: true });
    });
  }

  public shouldComponentUpdate(nextProps: Props) {
    if (nextProps.page !== this.props.page) {
      const { dispatchLoadCharts, page, userGroup } = nextProps;

      if (!this.isFetched(page)) {
        dispatchLoadCharts(page, userGroup);
      }
    }

    return true;
  }

  public componentWillUnmount() {
    if (this.initialDispatchTimeout) {
      window.clearTimeout(this.initialDispatchTimeout);
      this.initialDispatchTimeout = null;
      this.setState({ isInitialized: true });
    }
  }

  public render() {
    const { collection, books, page } = this.props;
    const itemCount: number = collection.itemCount ? collection.itemCount : 0;

    return (
      <main className="SceneWrapper">
        <HelmetWithTitle titleName={PageTitleText.CHARTS} />
        <ConnectedPageHeader pageTitle={PageTitleText.CHARTS} />
        {!this.isFetched(page) || isNaN(page) ? (
          <GridBookListSkeleton displayRanking />
        ) : (
          <>
            <ConnectedGridBookList
              serviceTitleForTracking="select-book"
              pageTitleForTracking="popular"
              uiPartTitleForTracking="book-list"
              miscTracking={JSON.stringify({ sect_page: page })}
              books={collection.itemListByPage[page].itemList.map(id => books[id].book!)}
              isChart
              page={page}
            />
            {itemCount > 0 && (
              <MediaQuery maxWidth={MAX_WIDTH}>
                {isMobile => (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(itemCount / COUNT_PER_PAGE)}
                    isMobile={isMobile}
                    item={{
                      el: Link,
                      getProps: (p): LinkProps => ({
                        to: `/charts?page=${p}`,
                      }),
                    }}
                  />
                )}
              </MediaQuery>
            )}
          </>
        )}
      </main>
    );
  }
}

const mapStateToProps = (rootState: RidiSelectState): CollectionStateProps => ({
  collection: rootState.collectionsById.popular,
  books: rootState.booksById,
  page: getPageQuery(rootState),
  userGroup: rootState.user.userGroup,
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  dispatchLoadCharts: (page: number, userGroup?: number) =>
    dispatch(Actions.loadPopularBooksRequest({ userGroup, page })),
});
export const ConnectedCharts = withRouter(connect(mapStateToProps, mapDispatchToProps)(Charts));

export default ConnectedCharts;
