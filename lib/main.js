"use babel";

import { CompositeDisposable } from "atom";

export default {
  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "json-typegen:expand": () => this.expand()
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  expand() {
    console.log("expanding json_typegen!");

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;
    const text = editor.getText();

    // TODO: this regex only works for raw strings, possible (albeit hacky)
    // solution is to use multiple regexes, one for each string type
    const regex = /json_typegen!\("([\w\s]*)",\s*r#"(.*?)"#\)/g;

    const match = regex.exec(text);
    if (!match) {
      console.log("No match found");
      return;
    }
    console.log(match);
    const [, name, sample] = match;

    // TODO: api only takes actual samples, thus:
    // if "sample" is url, fetch it
    // if it is local file, read it
    // alternative would be to use CLI instead of web API

    fetch("http://vestera.as/json_typegen/api", {
      method: "POST",
      body: JSON.stringify({
        name: name,
        input: sample,
        runnable: "false"
      })
    })
      .then(res => {
        return Promise.all([res.status, res.text()]);
      })
      .then(res => {
        var status = res[0];
        var code = res[1];

        console.log("status:", status);
        console.log("code:", code);

        // TODO: divide into two code paths,
        // 1. first time use
        // 2. update and replace already generated code

        editor.moveToFirstCharacterOfLine();
        editor.insertText("// ");
        editor.moveToEndOfLine();
        editor.insertNewline();
        editor.insertText(code.trim());
      });
  }
};
