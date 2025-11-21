import './index.css';
import { Link } from 'react-router-dom';
import useRightSidebar from '../../hooks/useRightSidebar';
import AdContainer from '../adContainer';

const RightSidebar = () => {
  const { topCommunities, hotQuestions, loading } = useRightSidebar();

  return (
    <div className='rightSidebar'>
      <div className='sidebar_section'>
        <h3 className='sidebar_section_title'>Top Communities</h3>
        {loading ? (
          <div className='sidebar_item'>Loading...</div>
        ) : topCommunities.length > 0 ? (
          topCommunities.map(community => (
            <div key={community._id.toString()} className='sidebar_item'>
              <div className='sidebar_item_content'>
                <Link to={`/communities/${community._id}`} className='sidebar_link'>
                  {community.name}
                </Link>
                <span className='sidebar_meta'>{community.participants.length} members</span>
              </div>
            </div>
          ))
        ) : (
          <div className='sidebar_item'>No communities yet</div>
        )}
      </div>

      <div className='sidebar_section'>
        <h3 className='sidebar_section_title'>Hot Questions</h3>
        {loading ? (
          <div className='sidebar_item'>Loading...</div>
        ) : hotQuestions.length > 0 ? (
          hotQuestions.map(question => (
            <div key={question._id.toString()} className='sidebar_item'>
              <div className='sidebar_item_content'>
                <Link to={`/question/${question._id}`} className='sidebar_link'>
                  {question.title}
                </Link>
                <span className='sidebar_meta'>{question.views.length} views</span>
              </div>
            </div>
          ))
        ) : (
          <div className='sidebar_item'>No questions yet</div>
        )}
      </div>

      {/* Ad at the bottom of right sidebar */}
      <AdContainer adKey='7beebaa8acee60713ef045584ce68a7b' width={300} height={250} />
    </div>
  );
};

export default RightSidebar;
