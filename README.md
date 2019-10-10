<p align="center">
  <a title="Go Report Card" href="https://goreportcard.com/report/github.com/1138-4EB/issue-runner"><img src="https://goreportcard.com/badge/github.com/1138-4EB/issue-runner?longCache=true&style=flat-square"></a><!--
  -->
  <a title="godoc.org" href="https://godoc.org/github.com/1138-4EB/issue-runner/tool"><img src="http://img.shields.io/badge/godoc-reference-5272B4.svg?longCache=true&style=flat-square"></a><!--
  -->
  <a title="Dependency Status" href="https://david-dm.org/1138-4EB/issue-runner"><img src="https://img.shields.io/david/1138-4EB/issue-runner.svg?longCache=true&style=flat-square&label=deps"></a><!--
  -->
  <a title="DevDependency Status" href="https://david-dm.org/1138-4EB/issue-runner?type=dev"><img src="https://img.shields.io/david/dev/1138-4EB/issue-runner.svg?longCache=true&style=flat-square&label=devdeps"></a><!--
  -->
</p>

**issue-runner** is a toolkit to retrive, set up and run Minimal Working Examples (MWEs). MWEs are defined in a markdown file (such as the first comment in a GitHub issue), and external tarball(s)/zipfile(s)/file(s) can be included. The main use case for this toolkit is to be added to a GitHub Actions (GHA) workflow in order to monitor the issues in a repository and optionally report status/results by:

- labelling issues as `reproducible` or `fixed?`,
- adding a comment to the issue with logs and/or refs to jobs/artifacts,
- and/or making test artifacts available through a CI job

Nonetheless, the CLI tool can also be used to set up and test any MWE or issue locally.

# Installation

## Set up a GitHub Actions workflow

The following block shows a minimal YAML workflow file:

```yml
name: 'issue?'
on:
  issues:
    types: [ opened, edited ]
jobs:
  mwe:
    runs-on: ubuntu-latest
    steps:
    - uses: 1138-4EB/issue-runner@gha-v1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        allow-host: false
```

Note that `with` parameters are both optional:

- `token` is required to report feedback (labelling issues or adding comments automatically).
- `allow-host` enables/disables running scripts on the host (without a container). For security reasons, this is discouraged and this parameter defaults to `false`.

## CLI tool

The CLI tool is a static binary written in golang, which can optionally use `docker`. It can be downloaded from [github.com/1138-4EB/issue-runner/releases](https://github.com/1138-4EB/issue-runner/releases), or it can be built from sources:

```
git clone https://github.com/1138-4EB/issue-runner
cd tool
go build -o issue-runner
```

<!--
```sh
curl -L https://raw.githubusercontent.com/1138-4EB/issue-runner/master/tool/get.sh | sh -
```

> You can give it a try at [play-with-docker.com](https://labs.play-with-docker.com/). Just create a node and run the command above.
-->

# Usage

## Supported markdown syntax

**issue-runner** scans the (markdown) body to extract:

- Code blocks with either the body or the language definition string matching `:file:.*`:

~~~md
```sh :file: hello.sh
#!/usr/bin/env sh
echo "Hello world!"
```
~~~

~~~md
```sh
#!/usr/bin/env sh
echo "Hello world!"
#:file: hello.sh
```
~~~

Note that, in the latter, `:file:` is prepended with a comment symbol that depends on the target language.

- Attached/linked text files, tarballs or zipfiles with the name to the reference matching `:mwe:.*`:

~~~md
[:mwe:filename.ext.txt](URL)
[:mwe:filename.tar.gz](URL)
~~~

Since GitHub allows uploading files with a limited set of extensions, issue-runner expects the user to append `.txt` to attached source filenames. This extra extension is trimmed. The exception to rule above are tarballs, zipfiles or txt files. No extra extension needs to be appended. The content of these is automatically extracted.

## Entrypoint

One, and only one, of the code blocks should contain `:image:.*` instead of `:file:.*`. That file will be the entrypoint to an OCI container. For example:

~~~md
```sh :image: debian:buster-slim
echo "Hello world!"
```
~~~

~~~md
```py
#!/usr/bin/env python3

print('Hello world!')

#:image: python:slim-buster
```
~~~

> NOTE: to execute the MWE in multiple images, provide a space separated list. For example: `:image: alpine ghdl/ghdl:buster-mcode ubuntu:19.04`.

Alternatively, if no `:image:` is defined, the file which is named `run` will be used as the entrypoint to execute the MWE on the host.

## CLI

> NOTE: automatically labelling/commenting features are not included in the CLI tool. These features are implemented in the GitHub Action only.

At least one of the following references needs to be provided:

- Path or URL to markdown file: `issue-runner path/to/markdown/file.md`
- Full URL to a GitHub issue: `issue-runner 'https://github.com/user/repo/issues/number'`
- Short reference of a GitHub issue (see [GitHub Help: Autolinked references and URLs](https://help.github.com/articles/autolinked-references-and-urls/#issues-and-pull-requests)): `issue-runner 'user/repo#number'`

---

Providing a list of identifiers is also supported. For example:

```sh
issue-runner \
  'https://raw.githubusercontent.com/1138-4EB/issue-runner/master/examples/vunit_py.md' \
  test/vunit_sh.md \
  'VUnit/vunit#337' \
  'ghdl/ghdl#579' \
  'ghdl/ghdl#584'
```

> NOTE: multiple references can be managed as a single MWE with flag `-m|--merge`.

---

MWEs defined in a single body can be read through *stdin*. For example:

```sh
cat ./__tests__/md/hello001.md | ./issue-runner -
# or
./issue-runner -y - < ./__tests__/md/hello003.md
```

