'use strict';

var Octokat = require('octokat');
var extend = require('extend');

var defaults = {
  branchName: 'master',
  token: '',
  username: '',
  reponame: ''
};

function init(options) {

  options = extend({}, defaults, options);
  var head;

  var octo = new Octokat({
    token: options.token
  });
  
  var repo = octo.repos(options.username, options.reponame);

  function fetchHead() {
    return repo.git.refs.heads(options.branchName).fetch();
  }

  function fetchTree() {
    return fetchHead().then(function(commit) {
      head = commit;
      return repo.git.trees(commit.object.sha).fetch();
    });
  }

  function commit(files, message) {
    return Promise.all(files.map(function(file) {
      return repo.git.blobs.create({
        content: file.content,
        encoding: 'utf-8'
      });
    })).then(function(blobs) {
      return fetchTree().then(function(tree) {
        return repo.git.trees.create({
          tree: files.map(function(file, index) {
            return {
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blobs[index].sha
            };
          }),
          basetree: tree.sha
        });
      });
    }).then(function(tree) {
      return repo.git.commits.create({
        message: message,
        tree: tree.sha,
        parents: [
          head.object.sha
        ]
      });
    }).then(function(commit) {
      return repo.git.refs.heads(options.branchName).update({
        sha: commit.sha
      });
    });

  }

  return {
    commit: commit
  };
}

module.exports = init;