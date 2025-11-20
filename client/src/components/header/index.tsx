import useHeader from '../../hooks/useHeader';
import './index.css';
import useTransactionWindow from '../../hooks/useTransactionWindow';

/**
 * Header component that renders the main title and a search bar.
 * The search bar allows the user to input a query and navigate to the search results page
 * when they press Enter.
 */
const Header = () => {
  const { val, handleInputChange, handleKeyDown, coins } = useHeader();
  const { setType, type } = useTransactionWindow();

  const handleCoinClick = async () => {
    setType('premium');
    // openTransactionWindow('premium');
  };

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
      <button
        id='image'
        className='image-with-text'
        onClick={() => {
          // eslint-disable-next-line no-console
          console.log(`current type ${type}`);
          setType('premium');
          // eslint-disable-next-line no-console
          console.log(`premium set click ${type}`);
        }}>
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
      </button>
    </div>
  );
};

export default Header;
