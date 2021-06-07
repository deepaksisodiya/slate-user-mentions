import React, {  useMemo, useState } from 'react';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react'
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

  return (
    <div style={{ border: '1px solid' }}>
      <Slate
        editor={editor}
        value={value}
        onChange={newValue => setValue(newValue)}
      >
        <Editable />
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

export default App;
