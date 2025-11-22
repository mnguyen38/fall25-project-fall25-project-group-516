import QuestionView from '../../questionPage/question';
import useCollectionPage from '../../../../hooks/useCollectionPage';
import './index.css';
import DeleteCollectionButton from '../deleteCollectionButton';

/**
 * CollectionPage component displays the details of a collection including its title, description,
 * metadata, and a list of questions within the collection.
 */
const CollectionPage = () => {
  const { collection, isOwner } = useCollectionPage();

  if (!collection) {
    return <div className='loading'>Loading...</div>;
  }

  return (
    <div className='collection-page'>
      <div className='collection-header'>
        <div className='header-row'>
          <h1 className='collection-title'>{collection.name}</h1>
          {isOwner && <DeleteCollectionButton collectionId={collection._id.toString()} />}
        </div>
        <p className='collection-description'>{collection.description}</p>
        <p className='collection-meta'>
          {collection.isPrivate ? 'Private' : 'Public'} • by {collection.username}
        </p>
      </div>

      <div className='questions-list'>
        {collection.questions.map(q => (
          <QuestionView
            question={q}
            key={q._id.toString()}
            collectionEditMode={false}
            onCollectionClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default CollectionPage;
