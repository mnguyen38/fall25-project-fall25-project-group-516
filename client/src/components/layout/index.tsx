import './index.css';
import { Outlet } from 'react-router-dom';
import SideBarNav from '../main/sideBarNav';
import RightSidebar from '../rightSidebar';
import Header from '../header';
import Footer from '../footer';

/**
 * Main component represents the layout of the main page, including a sidebar and the main content area.
 */
const Layout = () => (
  <>
    <Header />
    <div id='main' className='main'>
      <SideBarNav />
      <div id='right_main' className='right_main'>
        <Outlet />
      </div>
      <RightSidebar />
    </div>
    <Footer />
  </>
);

export default Layout;
