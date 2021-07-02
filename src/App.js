/* eslint-disable default-case */
import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import {
  createEditor,
  Editor,
  Range,
  Transforms,
  Element as SlateElement,
} from "slate";
import {
  Slate,
  Editable,
  withReact,
  useSelected,
  useFocused,
  ReactEditor,
  useSlate,
} from "slate-react";
import { withHistory } from "slate-history";
import ReactDOM from "react-dom";
import isUrl from "is-url";

import characters from "./characters";

const initialValue = [
  {
    type: "paragraph",
    children: [{ text: "A line of text in a paragraph." }],
  },
  {
    type: "paragraph",
    children: [
      {
        text: "In addition to block nodes, you can create inline nodes, like ",
      },
      {
        type: "link",
        url: "https://en.wikipedia.org/wiki/Hypertext",
        children: [{ text: "hyperlinks" }],
      },
      {
        text: "!",
      },
    ],
  },
];

const App = () => {
  const editor = useMemo(
    () => withLinks(withMentions(withReact(withHistory(createEditor())))),
    []
  );

  const [value, setValue] = useState(
    JSON.parse(localStorage.getItem("content")) || initialValue
  );
  const [target, setTarget] = useState();
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const ref = useRef();

  const chars = characters
    .filter((character) =>
      character.toLowerCase().startsWith(search.toLowerCase())
    )
    .slice(0, 10);
  console.log("chars ", chars);

  const onKeyDown = useCallback(
    (event) => {
      if (target) {
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            const prevIndex = index >= chars.length - 1 ? 0 : index + 1;
            setIndex(prevIndex);
            break;
          case "ArrowUp":
            event.preventDefault();
            const nextIndex = index <= 0 ? chars.length - 1 : index - 1;
            setIndex(nextIndex);
            break;
          case "Tab":
          case "Enter":
            event.preventDefault();
            Transforms.select(editor, target);
            insertMention(editor, chars[index]);
            setTarget(null);
            break;
          case "Escape":
            event.preventDefault();
            setTarget(null);
            break;
        }
      }
    },
    [index, search, target]
  );

  useEffect(() => {
    // setting the position of dropdown users element
    if (target && chars.length > 0) {
      const el = ref.current;
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      el.style.top = `${rect.top + window.pageYOffset + 24}px`;
      el.style.left = `${rect.left + window.pageXOffset}px`;
    }
  }, [chars.length, editor, index, search, target]);

  const renderElement = useCallback((props) => {
    const { attributes, children, element } = props;
    switch (element.type) {
      case "mention":
        return <Mention {...props} />;
      case "link":
        return (
          <a {...attributes} href={element.url}>
            {children}
          </a>
        );
      default:
        return <p {...attributes}>{children}</p>;
    }
  }, []);

  const onChange = (newValue) => {
    console.log("newValue ", newValue);
    setValue(newValue);

    const content = JSON.stringify(newValue);
    localStorage.setItem("content", content);

    const { selection } = editor;
    console.log("selection ", selection);

    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      console.log("start ", start);

      const wordBefore = Editor.before(editor, start, { unit: "word" });
      console.log("wordBefore ", wordBefore);

      const before = wordBefore && Editor.before(editor, wordBefore);
      console.log("before ", before);

      const beforeRange = before && Editor.range(editor, before, start);
      console.log("beforeRange ", beforeRange);

      const beforeText = beforeRange && Editor.string(editor, beforeRange);
      console.log("beforeText ", beforeText);

      const beforeMatch = beforeText && beforeText.match(/^@(\w+)$/);
      console.log("beforeMatch ", beforeMatch);

      const after = Editor.after(editor, start);
      console.log("after ", after);

      const afterRange = Editor.range(editor, start, after);
      console.log("afterRange ", afterRange);

      const afterText = Editor.string(editor, afterRange);
      console.log("afterText ", afterText);

      const afterMatch = afterText.match(/^(\s|$)/);
      console.log("afterMatch ", afterMatch);

      if (beforeMatch && afterMatch) {
        setTarget(beforeRange);
        setSearch(beforeMatch[1]);
        setIndex(0);
        return;
      }
    }

    setTarget(null);
  };

  return (
    <div style={{ border: "1px solid" }}>
      <Slate editor={editor} value={value} onChange={onChange}>
        <div>
          <LinkButton />
          <RemoveLinkButton />
        </div>
        <Editable renderElement={renderElement} onKeyDown={onKeyDown} />
        {target && chars.length > 0 && (
          <Portal>
            <div
              ref={ref}
              style={{
                top: "-9999px",
                left: "-9999px",
                position: "absolute",
                zIndex: 1,
                padding: "3px",
                background: "white",
                borderRadius: "4px",
                boxShadow: "0 1px 5px rgba(0,0,0,.2)",
              }}
            >
              {chars.map((char, i) => (
                <div
                  key={char}
                  style={{
                    padding: "1px 3px",
                    borderRadius: "3px",
                    background: i === index ? "#B4D5FF" : "transparent",
                  }}
                >
                  {char}
                </div>
              ))}
            </div>
          </Portal>
        )}
      </Slate>
    </div>
  );
};

// plugins
// here we are defining that mention is inline element
// and mention is also void element, means we can not edit it
const withMentions = (editor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return element.type === "mention" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === "mention" ? true : isVoid(element);
  };

  return editor;
};

// links code from here

const withLinks = (editor) => {
  const { insertData, insertText, isInline } = editor;

  // link is inline element
  editor.isInline = (element) => {
    return element.type === "link" ? true : isInline(element);
  };

  // if text is URL then call wrapLink method
  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertText(text);
    }
  };

  // if text is URL then call wrapLink method
  editor.insertData = (data) => {
    const text = data.getData("text/plain");

    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};

const wrapLink = (editor, url) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;

  // if isCollapsed is true then both cursor start and end position are same
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: "link",
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
};

const unwrapLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
};

const isLinkActive = (editor) => {
  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
  return !!link;
};

export const Button = React.forwardRef(
  ({ active, reversed, buttonStyle, ...props }, ref) => {
    const style = { cursor: "pointer", color: "black" };
    if (active) {
      style.color = "red";
    }
    return <span {...props} ref={ref} style={{ ...style, ...buttonStyle }} />;
  }
);

const insertLink = (editor, url) => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};

const LinkButton = () => {
  const editor = useSlate();
  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={(event) => {
        event.preventDefault();
        const url = window.prompt("Enter the URL of the link:");
        if (!url) return;
        insertLink(editor, url);
      }}
      buttonStyle={{ marginRight: "10px" }}
    >
      Link
    </Button>
  );
};

const RemoveLinkButton = () => {
  const editor = useSlate();

  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={() => {
        if (isLinkActive(editor)) {
          unwrapLink(editor);
        }
      }}
    >
      Remove link
    </Button>
  );
};

// link code ends here

// this component render mentions like -> @deepak @omkar
const Mention = ({ attributes, children, element }) => {
  const selected = useSelected();
  const focused = useFocused();
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        padding: "3px 3px 2px",
        margin: "0 1px",
        verticalAlign: "baseline",
        display: "inline-block",
        borderRadius: "4px",
        backgroundColor: "#eee",
        fontSize: "0.9em",
        boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
      }}
    >
      @{element.character}
      {children}
    </span>
  );
};

const Portal = ({ children }) => {
  return typeof document === "object"
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

const insertMention = (editor, character) => {
  const mention = {
    type: "mention",
    character,
    children: [{ text: "" }],
  };

  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

export default App;
