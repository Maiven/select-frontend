import { Button, CheckBox, Empty } from '@ridi/rsg';
import { PCPageHeader } from 'app/components';
import { DTOBookThumbnail } from 'app/components/DTOBookThumbnail';
import { FetchStatusFlag } from 'app/constants';
import { ConnectedListWithPagination } from 'app/hocs/ListWithPaginationPage';
import { LandscapeBookListSkeleton } from 'app/placeholder/BookListPlaceholder';
import { MySelectBook, PaginatedMySelectBooks } from 'app/services/mySelect';
import { Actions } from 'app/services/mySelect';
import { BookIdsPair } from 'app/services/mySelect/requests';
import { getPageQuery } from 'app/services/routing/selectors';
import { RidiSelectState } from 'app/store';
import { downloadBooksInRidiselect } from 'app/utils/downloadUserBook';
import toast from 'app/utils/toast';
import { stringifyAuthors } from 'app/utils/utils';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

interface StateProps {
  mySelectBooks: PaginatedMySelectBooks;
  deletionFetchStatus: FetchStatusFlag;
  page: number;
}

type Props = StateProps & ReturnType<typeof mapDispatchToProps>;

interface State {
  bookInputs: {
    [mySelectBookId: string]: boolean;
  };
  isInitialized: boolean;
}

class MySelect extends React.Component<Props, State> {
  private initialDispatchTimeout?: number | null;
  public state: State = {
    bookInputs: {},
    isInitialized: false,
  };

  private handleDeleteButtonClick = () => {
    const { bookInputs } = this.state;
    const { deletionFetchStatus, dispatchDeleteMySelectRequest, mySelectBooks, page } = this.props;
    const isEveryBookChecked = this.areEveryBookChecked();
    const bookEntries: Array<[string, boolean]> = Object.entries(bookInputs);
    if (!bookEntries.some((entry) => entry[1]) || deletionFetchStatus !== FetchStatusFlag.IDLE) {
      toast.fail('삭제할 책을 선택해주세요.');
      return;
    }
    if (!confirm('삭제하시겠습니까?')) {
      return;
    }
    const deleteBookIdPairs = mySelectBooks.itemListByPage[page].itemList
      .filter((book) => !!bookInputs[book.mySelectBookId])
      .map((book) => ({
        bookId: book.id,
        mySelectBookId: book.mySelectBookId,
      }));
    dispatchDeleteMySelectRequest(deleteBookIdPairs, page, isEveryBookChecked);
  }

  private handleDownloadSelectedBooksButtonClick = () => {
    const { bookInputs } = this.state;
    const { mySelectBooks, page } = this.props;
    const bookEntries: Array<[string, boolean]> = Object.entries(bookInputs);
    if (bookEntries.filter(([_, selected]) => selected).length === 0) {
      toast.fail('다운로드할 책을 선택해주세요.');
      return;
    }
    const bookIds = mySelectBooks.itemListByPage[page].itemList
      .filter((book) => !!bookInputs[book.mySelectBookId])
      .map((book) => book.id);
    downloadBooksInRidiselect(bookIds);
  }

  private handleDownloadBookButtonClick = (book: MySelectBook) => () => {
    downloadBooksInRidiselect([book.id]);
  }

  private handleSelectAllCheckBoxChange = () => {
    const { mySelectBooks, page } = this.props;
    const books = mySelectBooks.itemListByPage[page].itemList;
    this.setState({
      bookInputs: books.reduce((prev, book) => {
        return {
          ...prev,
          [book.mySelectBookId]: !this.areEveryBookChecked(),
        };
      }, {}),
    });
  }

  private areEveryBookChecked = () => {
    const { bookInputs } = this.state;
    const { mySelectBooks, page } = this.props;

    const books = mySelectBooks.itemListByPage[page].itemList;

    return Object.keys(bookInputs).length > 0 && books.every((book) => bookInputs[book.mySelectBookId]);
  }

  public componentDidMount() {
    this.initialDispatchTimeout = window.setTimeout(() => {
      this.initialDispatchTimeout = null;
      this.setState({ isInitialized: true });
    });
  }

  public componentDidUpdate(prevProps: Props) {
    const { dispatchResetMySelectPageFetchedStatus, mySelectBooks, page } = this.props;
    if (prevProps.page !== page) {
      this.setState({
        bookInputs: {},
      });
      dispatchResetMySelectPageFetchedStatus(prevProps.page);
    }
    const books =
      mySelectBooks &&
      mySelectBooks.itemListByPage[page] &&
      mySelectBooks.itemListByPage[page].itemList ?
      mySelectBooks.itemListByPage[page].itemList : [];
    const prevBooksLength =
      prevProps.mySelectBooks &&
      prevProps.mySelectBooks.itemListByPage[prevProps.page] &&
      prevProps.mySelectBooks.itemListByPage[prevProps.page].itemList ?
      prevProps.mySelectBooks.itemListByPage[prevProps.page].itemList.length : 0;
    if (prevBooksLength !== books.length) {
      // Set up state for checkboxes
      this.setState({
        bookInputs: Object.values(books).reduce((prev, book: MySelectBook) => {
          return {
            ...prev,
            [book.mySelectBookId]: this.state.bookInputs[book.mySelectBookId] || false,
          };
        }, {}),
      });
    }
  }

  public componentWillUnmount() {
    const { page, dispatchResetMySelectPageFetchedStatus } = this.props;
    if (this.initialDispatchTimeout) {
      window.clearTimeout(this.initialDispatchTimeout);
      this.initialDispatchTimeout = null;
      this.setState({ isInitialized: false });
    }
    dispatchResetMySelectPageFetchedStatus(page);
  }

  public renderBooks(books: MySelectBook[]) {
    return (
      <div>
        <ul className="MySelectBookList">
          {books.map((book) => (
            <li className="MySelectBookList_Item" key={book.mySelectBookId}>
              <CheckBox
                className="MySelectBookList_CheckBox"
                checked={this.state.bookInputs[book.mySelectBookId] || false}
                onChange={(e) =>
                  this.setState({
                    ...this.state,
                    bookInputs: {
                      ...this.state.bookInputs,
                      [book.mySelectBookId]: e.target.checked,
                    },
                  })
                }
              />
              <div className="MySelectBookList_Book">
                <DTOBookThumbnail
                  book={book}
                  width={100}
                  linkUrl={`/book/${book.id}`}
                  linkType="Link"
                  imageClassName="MySelectBookList_Thumbnail"
                  linkWrapperClassName="MySelectBookList_Link"
                />
                <div className="MySelectBookList_Right">
                  <Link to={`/book/${book.id}`} className="MySelectBookList_Link">
                    <div className="MySelectBookList_Meta">
                      <h2 className="MySelectBookList_Title">{book.title.main}</h2>
                      <span className="MySelectBookList_Authors">{stringifyAuthors(book.authors, 2)}</span>
                    </div>
                  </Link>
                  <Button
                    color="blue"
                    className="MySelectBookList_IndividualDownload"
                    onClick={this.handleDownloadBookButtonClick(book)}
                  >
                    다운로드
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  public render() {
    const { mySelectBooks, dispatchLoadMySelectRequest } = this.props;
    return (
      <main className="SceneWrapper">
        <Helmet>
          <title>마이 셀렉트 - 리디셀렉트</title>
        </Helmet>
        <div className="PageMySelect">
          {!this.state.isInitialized ? (
            <LandscapeBookListSkeleton hasCheckbox={true} />
          ) : (
            <ConnectedListWithPagination
              isFetched={(page: number) =>
                mySelectBooks &&
                mySelectBooks.itemListByPage[page] &&
                mySelectBooks.itemListByPage[page].isFetched
              }
              fetch={(page: number) => dispatchLoadMySelectRequest(page)}
              itemCount={mySelectBooks ? mySelectBooks.itemCount : undefined}
              itemCountPerPage={mySelectBooks.size}
              buildPaginationURL={(page: number) => `/my-select?page=${page}`}
              renderPlaceholder={() => (<LandscapeBookListSkeleton hasCheckbox={true} />)}
              renderItems={(page: number) =>
                mySelectBooks.itemCount === 0 ? (
                  <Empty description="마이 셀렉트에 등록된 도서가 없습니다." iconName="book_1" />
                ) : (
                  <>
                    <PCPageHeader pageTitle="마이 셀렉트" />
                    <div className="PageMySelect">
                      <div className="MySelectControls">
                        <div className="MySelectControls_CheckBoxWrapper">
                          <CheckBox
                            className="MySelectControls_CheckBox"
                            checked={this.areEveryBookChecked()}
                            onChange={this.handleSelectAllCheckBoxChange}
                          >
                            전체 선택
                          </CheckBox>
                        </div>
                        <Button
                          onClick={this.handleDeleteButtonClick}
                          className="MySelectControls_Button"
                          outline={true}
                          spinner={this.props.deletionFetchStatus === FetchStatusFlag.FETCHING}
                        >
                          선택 삭제
                        </Button>
                        <Button
                          className="MySelectControls_Button"
                          color="blue"
                          onClick={this.handleDownloadSelectedBooksButtonClick}
                        >
                          다운로드
                        </Button>
                      </div>
                      {this.renderBooks(mySelectBooks.itemListByPage[page].itemList)}
                    </div>
                  </>
                )
              }
            />
          )}
        </div>
      </main>
    );
  }
}

const mapStateToProps = (state: RidiSelectState, props: {}): StateProps => {
  return {
    mySelectBooks: state.mySelect.mySelectBooks,
    deletionFetchStatus: state.mySelect.deletionFetchStatus,
    page: getPageQuery(state, props),
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    dispatchLoadMySelectRequest: (page: number) =>
      dispatch(Actions.loadMySelectRequest({ page })),
    dispatchDeleteMySelectRequest: (deleteBookIdPairs: BookIdsPair[], page: number, isEveryBookChecked: boolean) =>
      dispatch(Actions.deleteMySelectRequest({ deleteBookIdPairs, page, isEveryBookChecked })),
    dispatchResetMySelectPageFetchedStatus: (page: number) =>
      dispatch(Actions.resetMySelectPageFetchedStatus({ page })),
  };
};

export const ConnectedMySelect = connect(mapStateToProps, mapDispatchToProps)(MySelect);
