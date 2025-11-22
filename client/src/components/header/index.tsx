import { FiBell } from 'react-icons/fi';
import useHeader from '../../hooks/useHeader';
import './index.css';
import { useNavigate } from 'react-router-dom';

/**
 * Header component that renders the main title and a search bar.
 * The search bar allows the user to input a query and navigate to the search results page
 * when they press Enter.
 */
const Header = () => {
  const { val, handleInputChange, handleKeyDown, coins, handleNotifRedirect } = useHeader();

  return (
    <div id='header' className='header'>
      <div></div>
      <div className='title'>Fake Stack Overflow</div>
      <input
        id='searchBar'
        placeholder='Search ...'
        type='text'
        value={val}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <div id='image' className='image-with-text'>
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
      </div>
      <button className='notifications-btn' onClick={() => handleNotifRedirect()}>
        <FiBell size={20}></FiBell>
      </button>
    </div>
  );
};

export default Header;
