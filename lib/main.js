"use babel";

import { CompositeDisposable } from "atom";
import { readFile } from "fs";
import upTheTree from "up-the-tree";

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

    let promisedInput;
    if (sample.startsWith("http://") || sample.startsWith("https://")) {
      promisedInput = fetch(sample);
    } else if (sample.startsWith("[") || sample.startsWith("{")) {
      promisedInput = Promise.resolve(sample);
    } else {
      const resolvedPath = upTheTree('Cargo.toml', {
        start: editor.getPath(),
        twig: true
      }).resolve(sample);

      promisedInput = new Promise((resolve, reject) => {
        readFile(resolvedPath, 'utf8', (err, data) => {
          if(err !== null) return reject(err);
          console.log(data);
          resolve(data);
        })
      });
    }

    promisedInput
      .then(input => {
        return fetch("http://vestera.as/json_typegen/api", {
          method: "POST",
          body: JSON.stringify({
            name: name,
            input: input,
            runnable: "false"
          })
        })
      })
      .then(res => {
        return Promise.all([res.status, res.text()]);
      })
      .then(res => {
        var status = res[0];
        var output = res[1];

        console.log("status:", status);
        console.log("output:", output);

        if (status !== 200) {
          throw output;
        }

        // TODO: divide into two code paths,
        // 1. first time use
        // 2. update and replace already generated code

        editor.moveToFirstCharacterOfLine();
        editor.insertText("// ");
        editor.moveToEndOfLine();
        editor.insertNewline();
        editor.insertText(output.trim());
      });
  }
};
