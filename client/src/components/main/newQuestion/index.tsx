import useNewQuestion from '../../../hooks/useNewQuestion';
import Form from '../baseComponents/form';
import Input from '../baseComponents/input';
import TextArea from '../baseComponents/textarea';
import './index.css';

/**
 * NewQuestionPage component allows users to submit a new question with a title,
 * description, tags, and username.
 */
const NewQuestionPage = () => {
  const {
    title,
    setTitle,
    text,
    setText,
    tagNames,
    setTagNames,
    communityList,
    handleDropdownChange,
    isAnonymous,
    setIsAnonymous,
    titleErr,
    textErr,
    tagErr,
    postQuestion,
  } = useNewQuestion();

  return (
    <Form>
      <Input
        title={'Question Title'}
        hint={'Limit title to 100 characters or less'}
        id={'formTitleInput'}
        val={title}
        setState={setTitle}
        err={titleErr}
      />
      <TextArea
        title={'Question Text'}
        hint={'Add details'}
        id={'formTextInput'}
        val={text}
        setState={setText}
        err={textErr}
      />
      <h5>
        <i>Markdown formatting is supported.</i>
      </h5>
      <Input
        title={'Tags'}
        hint={'Add keywords separated by whitespace'}
        id={'formTagInput'}
        val={tagNames}
        setState={setTagNames}
        err={tagErr}
      />
      <div className='input_title'>Community</div>
      <select className='form_communitySelect' onChange={handleDropdownChange}>
        <option value=''>Select Community</option>
        {communityList.map(com => (
          <option key={com._id.toString()} value={com._id.toString()}>
            {com.name}
          </option>
        ))}
      </select>
      <div
        className='anonymous_checkbox_container'
        style={{ marginTop: '15px', marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type='checkbox'
            id='anonymousCheckbox'
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            style={{ marginRight: '8px', cursor: 'pointer' }}
          />
          Post anonymously (your username will not be shown)
        </label>
      </div>
      <div className='btn_indicator_container'>
        <button
          className='form_postBtn'
          onClick={() => {
            postQuestion();
          }}>
          Post Question
        </button>
        <div className='mandatory_indicator'>* indicates mandatory fields</div>
      </div>
    </Form>
  );
};

export default NewQuestionPage;
