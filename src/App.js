import React, {  useMemo, useState } from 'react';

import { createEditor } from 'slate';

import { Slate, Editable, withReact } from 'slate-react'

const App = () => {

  const editor = useMemo(() => withReact(createEditor()), []);

  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'A line of text in a paragraph.' }],
    },
  ]);

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

export default App;
