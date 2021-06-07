import React, {  useCallback, useMemo, useState } from 'react';
import { createEditor, Editor, Range } from 'slate';
import { Slate, Editable, withReact, useSelected, useFocused } from 'slate-react'
import { withHistory } from 'slate-history'

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: 'A line of text in a paragraph.' }],
  },
];

const App = () => {

  const editor = useMemo(() => withMentions(withReact(withHistory(createEditor()))), []);

  const [value, setValue] = useState(initialValue);
  const [target, setTarget] = useState();
  const [search, setSearch] = useState('');
  const [index, setIndex] = useState(0);

  const renderElement = useCallback(props => {
    const { attributes, children, element } = props;
    switch (element.type) {
      case 'mention':
        return <Mention {...props} />
      default:
        return <p {...attributes}>{children}</p>
    }
  }, []);

  const onChange = (newValue) => {
    setValue(newValue);
    const { selection } = editor
    console.log('selection ', selection);

    if (selection && Range.isCollapsed(selection)) {

      const [start] = Range.edges(selection);
      console.log('start ', start);

      const wordBefore = Editor.before(editor, start, { unit: 'word' })
      console.log('wordBefore ', wordBefore);

      const before = wordBefore && Editor.before(editor, wordBefore);
      console.log('before ', before);

      const beforeRange = before && Editor.range(editor, before, start);
      console.log('beforeRange ', beforeRange);

      const beforeText = beforeRange && Editor.string(editor, beforeRange);
      console.log('beforeText ', beforeText);

      const beforeMatch = beforeText && beforeText.match(/^@(\w+)$/);
      console.log('beforeMatch ', beforeMatch);

      const after = Editor.after(editor, start);
      console.log('after ', after);

      const afterRange = Editor.range(editor, start, after);
      console.log('afterRange ', afterRange);

      const afterText = Editor.string(editor, afterRange);
      console.log('afterText ', afterText);

      const afterMatch = afterText.match(/^(\s|$)/);
      console.log('afterMatch ', afterMatch);

      if (beforeMatch && afterMatch) {
        setTarget(beforeRange)
        setSearch(beforeMatch[1])
        setIndex(0)
        return
      }

    }

    setTarget(null)
  }

  return (
    <div style={{ border: '1px solid' }}>
      <Slate
        editor={editor}
        value={value}
        onChange={onChange}
      >
        <Editable renderElement={renderElement} />
      </Slate>
    </div>
    
  );
}

// plugins
// here we are defining that mention is inline element
// and mention is also void element, means we can not edit it
const withMentions = editor => {
  const { isInline, isVoid } = editor

  editor.isInline = element => {
    return element.type === 'mention' ? true : isInline(element)
  }

  editor.isVoid = element => {
    return element.type === 'mention' ? true : isVoid(element)
  }

  return editor
}

// mention render component
const Mention = ({ attributes, children, element }) => {
  const selected = useSelected()
  const focused = useFocused()
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        padding: '3px 3px 2px',
        margin: '0 1px',
        verticalAlign: 'baseline',
        display: 'inline-block',
        borderRadius: '4px',
        backgroundColor: '#eee',
        fontSize: '0.9em',
        boxShadow: selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
      }}
    >
      @{element.character}
      {children}
    </span>
  )
}

export default App;
