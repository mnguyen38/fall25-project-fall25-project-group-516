import './index.css';
import { Outlet } from 'react-router-dom';
import SideBarNav from '../main/sideBarNav';
import RightSidebar from '../rightSidebar';
import Header from '../header';
import Footer from '../footer';
import TransactionWindow from '../transactionWindow';
import useTransactionWindow from '../../hooks/useTransactionWindow';

/**
 * Main component represents the layout of the main page, including a sidebar and the main content area.
 */
const Layout = () => {
  const {
    showWindow,
    setShowWindow,
    setType,
    cost,
    title,
    description,
    awarded,
    handleConfirmation,
  } = useTransactionWindow();

  return (
    <>
      <Header />
      <div id='main' className='main'>
        <SideBarNav />
        <div id='right_main' className='right_main'>
          <Outlet />
          <TransactionWindow
            isOpen={showWindow}
            onClose={() => {
              setShowWindow(false);
              setType(null);
            }}
            onConfirm={handleConfirmation}
            cost={cost}
            title={title}
            description={description}
            awarded={awarded}
          />
        </div>
        <RightSidebar />
      </div>
      <Footer />
    </>
  );
};

export default Layout;
