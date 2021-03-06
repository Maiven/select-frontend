import { Button, Icon } from '@ridi/rsg';
import React from 'react';
import classNames from 'classnames';
import dateFnsFormat from 'date-fns/format';
import { connect } from 'react-redux';

import { RidiSelectState } from 'app/store';
import { EnvironmentState } from 'app/services/environment';
import { FetchStatusFlag, PageTitleText } from 'app/constants';
import { getIsIosInApp } from 'app/services/environment/selectors';
import { Actions as CommonUIActions } from 'app/services/commonUI';
import { ConnectedPageHeader, HelmetWithTitle } from 'app/components';
import { Actions, SubscriptionState, UserState } from 'app/services/user';
import { buildDateAndTimeFormat, buildOnlyDateFormat } from 'app/utils/formatDate';
import { SubscriptionListPlaceholder } from 'app/placeholder/SubscriptionListPlaceholder';

interface ManageSubscriptionStateProps {
  userState: UserState;
  environment: EnvironmentState;
  subscriptionState?: SubscriptionState | null;
  isIosInApp: boolean;
}

type ManageSubscriptionProps = ManageSubscriptionStateProps & ReturnType<typeof mapDispatchToProps>;

class ManageSubscription extends React.PureComponent<ManageSubscriptionProps> {
  private handleUnsubscribeButtonClick = () => {
    const { userState, subscriptionState, dispatchUnsubscribeRequest } = this.props;
    if (
      userState.unsubscriptionFetchStatus === FetchStatusFlag.FETCHING ||
      (subscriptionState &&
        subscriptionState.isSubscribedWithOldPrice &&
        !confirm(
          `구독 해지 예약 시 정기 결제 금액이\n${subscriptionState.formattedNewMonthlyPayPrice}으로 인상됩니다.그래도 해지를\n예약하시겠습니까?`,
        ))
    ) {
      return;
    }

    dispatchUnsubscribeRequest();
  };

  private handleCancelUnsubscriptionButtonClick = () => {
    if (this.props.userState.unsubscriptionCancellationFetchStatus === FetchStatusFlag.FETCHING) {
      return;
    }
    this.props.dispatchCancelUnsubscriptionRequest();
  };

  private handleChangePaymentButtonClick = (type: string) => {
    const { subscriptionState } = this.props;
    const { PAY_URL, STORE_URL } = this.props.environment;
    const currentLocation = encodeURIComponent(location.href);

    let locationUrl = `${PAY_URL}/settings/cards/change?returnUrl=${currentLocation}`;

    if (subscriptionState) {
      const { nextBillDate } = subscriptionState;
      const today = dateFnsFormat(new Date(), 'yyyyMMdd');
      const billDate = dateFnsFormat(new Date(nextBillDate), 'yyyyMMdd');
      const currentHour = new Date().getHours();
      // 결제일이랑 오늘날짜가 같고, 현재 시간이 23시~23시59분 사이라면 결제 불가 알림메시지
      if (today === billDate && currentHour === 23) {
        alert('결제일 23:00~23:59 시간에는 결제\n수단을 변경할 수 없습니다.');
        return;
      }

      // 해지 예약 상태일 때, 결제 수단 변경 시 카드가 있다면
      if (type === 'unsubscription') {
        locationUrl = `${STORE_URL}/select/payments/ridi-pay?is_payment_method_change=true&return_url=${currentLocation}`;
      }

      // 리디캐시 자동충전 중인 상태의 카드일때 컨펌메시지
      const { cardSubscription } = subscriptionState;
      if (cardSubscription) {
        const cardSubscriptionString = cardSubscription.join(',');
        if (
          cardSubscriptionString.includes('리디캐시 자동충전') &&
          !confirm(
            '리디캐시 자동충전이 설정된 카드입니다.\n결제 수단 변경 시 변경된 카드로 자동 충전됩니다.',
          )
        ) {
          return;
        }
      }
      window.location.href = locationUrl;
    }
  };

  public componentDidMount() {
    if (!this.props.subscriptionState) {
      this.props.dispatchLoadSubscriptionRequest();
    }
    this.props.dispatchUpdateGNBTabExpose(false);
  }

  public componentWillUnmount() {
    this.props.dispatchUpdateGNBTabExpose(true);
  }

  public render() {
    const { subscriptionState, environment, isIosInApp, userState } = this.props;
    const { STORE_URL } = environment;
    return (
      <main className={classNames('SceneWrapper', 'PageManageSubscription')}>
        <HelmetWithTitle titleName={PageTitleText.MANAGE_SUBSCRIPTION} />
        <ConnectedPageHeader pageTitle={PageTitleText.MANAGE_SUBSCRIPTION} />
        {subscriptionState ? (
          <>
            <ul className="SubscriptionInfo_List">
              <li className="SubscriptionInfo">
                <p className="SubscriptionInfo_Title">이용 기간</p>
                <p className="SubscriptionInfo_Data">
                  {`${buildDateAndTimeFormat(userState.availableUntil)} 까지`}
                </p>
              </li>
              {subscriptionState.isOptout ? (
                <li className="SubscriptionInfo">
                  <p className="SubscriptionInfo_Title">구독 해지 일시</p>
                  <p className="SubscriptionInfo_Data">
                    {buildDateAndTimeFormat(subscriptionState.optoutDate)}
                  </p>
                </li>
              ) : (
                <>
                  <li className="SubscriptionInfo">
                    <p className="SubscriptionInfo_Title">다음 결제 예정일</p>
                    <p className="SubscriptionInfo_Data">
                      {buildOnlyDateFormat(subscriptionState.nextBillDate)}
                    </p>
                  </li>
                  <li className="SubscriptionInfo">
                    <p className="SubscriptionInfo_Title">결제 예정 금액</p>
                    <p className="SubscriptionInfo_Data">
                      {subscriptionState.formattedMonthlyPayPrice}
                    </p>
                  </li>
                  <li className="SubscriptionInfo">
                    <p className="SubscriptionInfo_Title SubscriptionInfo_CardInfoColumn">
                      결제 수단
                    </p>
                    <div className="SubscriptionInfo_Data SubscriptionInfo_CardInfoColumn">
                      {subscriptionState.paymentMethod}
                      <div className="SubscriptionInfo_CardInfoWrapper">
                        {subscriptionState.cardBrand && subscriptionState.maskedCardNo && (
                          <p className="SubscriptionInfo_CardInfo">
                            {`${subscriptionState.cardBrand} ${subscriptionState.maskedCardNo}`}
                          </p>
                        )}
                        {subscriptionState.isUsingRidipay && !isIosInApp ? (
                          <a
                            className="SubscriptionInfo_Link"
                            onClick={() => {
                              this.handleChangePaymentButtonClick('subscription');
                            }}
                          >
                            결제 수단 변경
                            <Icon name="arrow_5_right" className="SubscriptionInfo_Link_Icon" />
                          </a>
                        ) : null}
                        {/* TODO: 추후 XPAY 유저가 없을 시 삭제 예정 */}
                        {subscriptionState.pgType === 'XPAY' &&
                          !subscriptionState.isUsingRidipay &&
                          !isIosInApp && (
                            <a
                              className="SubscriptionInfo_Link"
                              href={`${STORE_URL}/select/payments/xpay/change-to-ridi-pay?return_url=${encodeURIComponent(
                                location.href,
                              )}`}
                            >
                              결제 수단 변경
                              <Icon name="arrow_5_right" className="SubscriptionInfo_Link_Icon" />
                            </a>
                          )}
                      </div>
                    </div>
                  </li>
                </>
              )}
            </ul>
            <div className="ToggleSubscriptionButton_Wrapper">
              {subscriptionState.isOptout ? (
                subscriptionState.isOptoutCancellableWithPaymentMethodChange ? (
                  !isIosInApp && (
                    <Button
                      className="ToggleSubscriptionButton"
                      onClick={() => {
                        this.handleChangePaymentButtonClick('unsubscription');
                      }}
                      outline
                    >
                      구독 해지 예약 취소
                    </Button>
                  )
                ) : (
                  <Button
                    className="ToggleSubscriptionButton"
                    onClick={this.handleCancelUnsubscriptionButtonClick}
                    spinner={
                      this.props.userState.unsubscriptionCancellationFetchStatus ===
                      FetchStatusFlag.FETCHING
                    }
                    color="blue"
                    disabled={!subscriptionState.isOptoutCancellable}
                  >
                    구독 해지 예약 취소
                  </Button>
                )
              ) : (
                <Button
                  className="ToggleSubscriptionButton"
                  onClick={() => this.handleUnsubscribeButtonClick()}
                  outline
                  spinner={
                    this.props.userState.unsubscriptionFetchStatus === FetchStatusFlag.FETCHING
                  }
                >
                  구독 해지 예약
                </Button>
              )}
            </div>
            {!subscriptionState.isOptout && (
              <p className="UnsubscriptionInfoText">
                지금 해지 예약하셔도 {buildOnlyDateFormat(userState.availableUntil)}까지 이용할 수
                있습니다.
              </p>
            )}
            {subscriptionState.isOptout &&
              !subscriptionState.isOptoutCancellable &&
              subscriptionState.optoutReasonKor && (
                <p className="ReasonForNonCancellable">
                  <Icon className="ReasonForNonCancellable_Icon" name="exclamation_3" />
                  <strong>{subscriptionState.optoutReasonKor}</strong>
                  <br />
                  {subscriptionState.isOptoutCancellableWithPaymentMethodChange
                    ? '카드 재등록 시 구독 해지 예약을 취소할 수 있습니다.'
                    : '이용 기간 만료 후 다시 구독해주세요.'}
                </p>
              )}
          </>
        ) : (
          <SubscriptionListPlaceholder />
        )}
      </main>
    );
  }
}

const mapStateToProps = (state: RidiSelectState): ManageSubscriptionStateProps => ({
  userState: state.user,
  environment: state.environment,
  subscriptionState: state.user.subscription,
  isIosInApp: getIsIosInApp(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  dispatchLoadSubscriptionRequest: () => dispatch(Actions.loadSubscriptionRequest()),
  dispatchUnsubscribeRequest: () => dispatch(Actions.unsubscribeRequest()),
  dispatchCancelUnsubscriptionRequest: () => dispatch(Actions.cancelUnsubscriptionRequest()),
  dispatchUpdateGNBTabExpose: (isGnbTab: boolean) =>
    dispatch(CommonUIActions.updateGNBTabExpose({ isGnbTab })),
});

const ConnectedManageSubscription = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ManageSubscription);

export default ConnectedManageSubscription;
