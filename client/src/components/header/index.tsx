import { FiBell } from 'react-icons/fi';
import useHeader from '../../hooks/useHeader';
import './index.css';

interface HeaderProps {
  openTransactionWindow: () => void;
}

/**
 * Header component that renders the main title and a search bar.
 * The search bar allows the user to input a query and navigate to the search results page
 * when they press Enter.
 */
const Header = ({ openTransactionWindow }: HeaderProps) => {
  const {
    val,
    handleInputChange,
    handleKeyDown,
    coins,
    unreadNotifications,
    handleNotifPageRedirect,
  } = useHeader();

  const handleCoinClick = async () => {
    openTransactionWindow();
  };

  return (
    <div id='header' className='header'>
      <div></div>
      <div className='title-with-logo'>
        <img src='\logo\pancake_overflow.PNG' alt='Pancake Overflow Logo' className='header-logo' />
        <div className='title'>PancakeOverflow</div>
      </div>
      <input
        id='searchBar'
        placeholder='Search ...'
        type='text'
        value={val}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <button id='image' className='image-with-text' onClick={handleCoinClick}>
        <img
          src='\coinPicture\stack-coin.PNG'
          alt='Coin emblazoned stack of pancakes'
          width='50'
          height='50'
          background-color='transparent'
        />
        <div id='text' text-align='center' justify-content='center'>
          {coins}
        </div>
        <div id='text'></div>
      </button>
      <button className='notifications-btn' onClick={() => handleNotifPageRedirect()}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <FiBell size={20}></FiBell>
          {unreadNotifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '2px solid white',
              }}>
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};
export default Header;
