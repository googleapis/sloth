# sloth
This is a simple utility for tracking SLOs of GitHub repositories.

![sloth](http://i.imgur.com/su6XYp7.gif?320)

## Installation
Make sure you have node.js 8+ installed. Then do this:

```sh
$ npm install -g @justinbeckwith/sloth
```

## Usage
You need to go create a [personal access token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) in GitHub.  Take this token, and save it as an environment variable named `SLOTH_GITHUB_TOKEN`.

```sh
$ sloth
```

Alternatively, you can just set it every time before running the tool:

```sh
$ SLOTH_GITHUB_TOKEN=****** sloth
```

### CSV
You can also get output in CSV format!  Just pass the `--csv` flag:

```sh
$ sloth --csv
```

That's it 🎉 Enjoy!
