"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const exec = __importStar(require("@actions/exec"));
const fs_1 = require("fs");
const path_1 = require("path");
const gfm_code_blocks_1 = __importDefault(require("gfm-code-blocks"));
function runner(issue) {
    return __awaiter(this, void 0, void 0, function* () {
        core.startGroup('Print issue labels');
        console.log(issue.labels);
        core.endGroup();
        //core.startGroup('Print issue body');
        //console.log(issue.body);
        //core.endGroup()
        // TODO: is it worth replacing this library with a regexp?
        // https://coderwall.com/p/r6b4xg/regex-to-match-github-s-markdown-code-blocks
        // var code = s.match(/```([^`]*)```/)[1]
        const blocks = gfm_code_blocks_1.default(issue.body);
        const l = blocks.length;
        // FIXME: Check whether any attached tarball/zipfile exists.
        if (l === 0) {
            console.log("no code blocks found in issue body, skipping");
            return;
        }
        const dir = path_1.join(__dirname, 'tmp-dir');
        if (!fs_1.existsSync(dir)) {
            fs_1.mkdirSync(dir);
        }
        var img = 'host';
        // Write each code block to a file
        blocks.forEach(function (d, i) {
            process.stdout.write('Processing file ' + (i + 1) + '/' + l + '... ');
            const c = d.code.slice(1);
            var fname = c.match(/:file:.*/g);
            if (!fname) {
                fname = c.match(/:image:.*/g);
                if (!fname) {
                    console.log("code block does not contain ':file:' or ':image:', skipping");
                    return;
                }
                img = fname[0].replace(':image:', '').trim();
                fname = 'run';
            }
            else {
                fname = fname[0].replace(':file:', '').trim();
            }
            console.log(fname);
            var mode = 0o644;
            if (fname === 'run') {
                mode = 0o744;
            }
            // FIXME: why is each line preprended with '\n'? Is it coming from GitHub's payload or is it added by codeBlocks?
            fs_1.writeFileSync(path_1.join(dir, fname), c.replace(/\r\n/g, "\n"), { mode: mode });
        });
        if (!fs_1.existsSync(path_1.join(dir, 'run'))) {
            console.log("file 'run' not provided, skipping");
            return;
        }
        if (img != 'host') {
            core.startGroup('Docker pull ' + img);
            yield exec.exec(`docker`, ['pull', img]);
            core.endGroup();
            core.startGroup('Execute in docker container');
            yield exec.exec(`docker`, ['run', '--rm', '-tv', dir + ':/src', '-w', '/src', img, `./run`]);
            core.endGroup();
        }
        else {
            core.startGroup('Execute');
            yield exec.exec(`./run`, [], { cwd: dir });
            core.endGroup();
        }
        console.log(issue);
        /*
            import * as io from '@actions/io';
        
            const pythonPath: string = await io.which('python', true);
            await exec.exec(`"${pythonPath}"`, ['main.py']);
        */
        /*
        let myOutput = '';
        let myError = '';
        
        await exec.exec('node', ['index.js', 'foo=bar'], {
          listeners: {
            stdout: (data: Buffer) => { myOutput += data.toString(); },
            stderr: (data: Buffer) => { myError += data.toString(); }
          },
          cwd: './lib'
        });
        */
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const repoToken = core.getInput('token', { required: true });
            /*
                const ctx = github.context;
                //const issue: { owner: string; repo: string; number: number; } = ctx.issue;
            
                if (ctx.eventName != 'issues' || !ctx.payload.issue ) {
                  console.log('not an issue, skipping');
                  return
                }
            
                const act = ctx.payload.action;
                if (act != 'opened' && act != 'edited') {
                  console.log("issue neither 'opened' nor 'edited', skipping");
                  return;
                }
            
                runner(ctx.payload.issue);
            */
            const owner = '1138-4EB';
            const repo = 'issue-runner';
            const client = new github.GitHub(repoToken);
            const data = yield client.repos.listReleases({
                owner,
                repo
            });
            console.log(data);
            //    const client: github.GitHub = new github.GitHub(repoToken);
            //    await client.issues.createComment({
            //      owner: issue.owner,
            //      repo: issue.repo,
            //      issue_number: issue.number,
            //      body: 'Welcome message!'
            //    });
        }
        catch (error) {
            core.setFailed(error.message);
            throw error;
        }
    });
}
exports.run = run;
run();
/*
pull_request:      issues:       issue_comment:

opened             opened         created
edited             edited         edited
closed             closed
                   deleted        deleted
assigned           assigned
unassigned         unassigned
labeled            labeled
unlabeled          unlabeled
reopened           reopened
locked             locked
unlocked           unlocked
synchronize
ready_for_review
                   pinned
                   unpinned
                   milestoned
                   demilestoned
                   transferred
*/
//https://github.com/actions/labeler
//https://github.com/actions/first-interaction/blob/master/src/main.ts
//https://octokit.github.io/rest.js/
//https://octokit.github.io/rest.js/#octokit-routes-issues-list-comments
//https://octokit.github.io/rest.js/#octokit-routes-issues-update-comment
//https://octokit.github.io/rest.js/#octokit-routes-issues-get-comment
