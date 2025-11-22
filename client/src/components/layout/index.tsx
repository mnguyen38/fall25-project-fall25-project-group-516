import './index.css';
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SideBarNav from '../main/sideBarNav';
import RightSidebar from '../rightSidebar';
import Header from '../header';
import Footer from '../footer';
import AdBlockerModal from '../adBlockerModal';
import { detectAdBlockCombined } from '../../utils/adBlockDetector';
import TransactionWindow from '../transactionWindow';
import useTransactionWindow from '../../hooks/useTransactionWindow';
import usePremiumTransaction from '../../hooks/usePremiumTransaction';
import StreakRecoveryWindow from '../streakRecoveryWindow';
import useUserContext from '../../hooks/useUserContext';

/**
 * Main component represents the layout of the main page, including a sidebar and the main content area.
 */
const Layout = () => {
  const { user } = useUserContext();

  // Ad blocker detection - only for non-premium users
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Skip ad blocker detection for premium users
    if (user.premiumProfile) {
      return;
    }

    const checkAdBlock = async () => {
      const isBlocked = await detectAdBlockCombined();

      if (isBlocked) {
        setShowModal(true);
      }
    };

    checkAdBlock();
  }, [user.premiumProfile]);

  const handleDismiss = () => {
    setShowModal(false);
  };

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
          {/* Recover streak */}
          <StreakRecoveryWindow />
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
      {/* Ad blocker modal - only shown to non-premium users */}
      {!user.premiumProfile && <AdBlockerModal isVisible={showModal} onDismiss={handleDismiss} />}
    </>
  );
};

export default Layout;
