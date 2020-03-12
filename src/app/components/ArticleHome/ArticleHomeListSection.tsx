import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RidiSelectState } from 'app/store';
import { FetchStatusFlag } from 'app/constants';
import { articleListToPath } from 'app/utils/toPath';
import { ArticleResponse } from 'app/services/article/requests';
import { GridArticleList } from 'app/components/GridArticleList';
import { SectionHeader } from 'app/components/HomeSectionHeader';
import { Actions, ArticleListType } from 'app/services/articleList';
import * as styles from 'app/components/ArticleHome/articleHomeSectionStyles';
import { GridArticleListPlaceholder } from 'app/placeholder/GridArticleListPlaceholder';
import { ArticleSectionHeaderPlaceholder } from 'app/placeholder/ArticleSectionHeaderPlaceholder';

interface ArticleHomeSectionProps {
  title: string;
  order: number;
  articleListType: ArticleListType;
  articleList?: ArticleResponse[];
  articleChartList?: ArticleResponse[];
}

export const ArticleHomeListSection: React.FunctionComponent<ArticleHomeSectionProps> = props => {
  const { title, order, articleListType } = props;
  const ArticleCount = articleListType && articleListType === ArticleListType.RECENT ? 8 : 4;
  const articles = useSelector((state: RidiSelectState) => state.articlesById);
  const sectionItemList = useSelector((state: RidiSelectState) => {
    const itemList = state.articleList[articleListType].itemListByPage[1]?.itemList;
    return itemList?.length > ArticleCount ? itemList.slice(0, ArticleCount) : itemList;
  });
  const sectionDataFetchStatus = useSelector(
    (state: RidiSelectState) => state.articleList[articleListType].itemListByPage[1]?.fetchStatus,
  );

  const dispatch = useDispatch();
  React.useEffect(() => {
    if (sectionItemList !== undefined || sectionDataFetchStatus === FetchStatusFlag.FETCHING) {
      return;
    }
    dispatch(
      Actions.loadArticleListRequest({ type: articleListType, page: 1, size: ArticleCount }),
    );
  }, []);

  return (
    <section css={styles.articleSection}>
      {!sectionItemList ? (
        <>
          <ArticleSectionHeaderPlaceholder />
          <GridArticleListPlaceholder />
        </>
      ) : (
        <>
          <SectionHeader
            title={title}
            link={
              articleListType === ArticleListType.RECENT
                ? articleListToPath({ listType: 'recent' })
                : undefined
            }
          />
          <GridArticleList
            serviceTitleForTracking="select-article"
            pageTitleForTracking="home"
            uiPartTitleForTracking={`${articleListType.replace('ArticleList', '')}`}
            miscTracking={JSON.stringify({ sect_order: order })}
            renderChannelMeta
            renderAuthor
            articles={sectionItemList.map(id => articles[id].article!)}
          />
        </>
      )}
    </section>
  );
};
