import './index.css';
import { Outlet } from 'react-router-dom';
import SideBarNav from '../main/sideBarNav';
import RightSidebar from '../rightSidebar';
import Header from '../header';
import Footer from '../footer';
import TransactionWindow from '../transactionWindow';
import useTransactionWindow from '../../hooks/useTransactionWindow';
import usePremiumTransaction from '../../hooks/usePremiumTransaction';

/**
 * Main component represents the layout of the main page, including a sidebar and the main content area.
 */
const Layout = () => {
  // for login
  const {
    showRewardWindow,
    setShowRewardWindow,
    reward,
    rewardDescription,
    handleRewardConfirmation,
  } = useTransactionWindow();

  // for premium
  const {
    showPremiumWindow,
    setShowPremiumWindow,
    cost,
    handlePremiumConfirmation,
    openTransactionWindow,
  } = usePremiumTransaction();

  return (
    <>
      <Header openTransactionWindow={openTransactionWindow} />
      <div id='main' className='main'>
        <SideBarNav />
        <div id='right_main' className='right_main'>
          <Outlet />
          {/* Login reward */}
          <TransactionWindow
            isOpen={showRewardWindow}
            onClose={() => {
              setShowRewardWindow(false);
            }}
            onConfirm={handleRewardConfirmation}
            cost={reward}
            title='Login Reward'
            description={rewardDescription}
            awarded={true}
          />
          {/* Premium pruchase */}
          <TransactionWindow
            isOpen={showPremiumWindow}
            onClose={() => {
              setShowPremiumWindow(false);
            }}
            onConfirm={handlePremiumConfirmation}
            cost={cost}
            title='Premium Membership Purchase'
            description={`To purchase premium membership.\nPremium members will have their questions boosted in communities and be able to turn off ads.`}
            awarded={false}
          />
        </div>
        <RightSidebar />
      </div>
      <Footer />
    </>
  );
};

export default Layout;
