gulp = require 'gulp'
del = require 'del'
browserify = require 'gulp-browserify'
livereload = require 'gulp-livereload'
mochaPhantomJS = require 'gulp-mocha-phantomjs'
uglify = require 'gulp-uglify'
stringify = require 'stringify'
connect = require 'gulp-connect'
rename = require 'gulp-rename'
pkg = require './package'

logError = (e)->
  console.log e
  this.emit 'end'

gulp.task 'clean', (cb)->
  del.sync('bin')

gulp.task 'wet', ->
  gulp.src('src/wet.js')
      .pipe browserify
        debug: true
        transform: stringify
          extensions: ['.html'], minify: true
      .on 'error', logError
      .pipe gulp.dest 'bin/'
      .pipe livereload()

gulp.task 'test-compile', ->
  gulp.src('test/test.js')
      .pipe browserify
        debug: true
        transform: stringify
          extensions: ['.html'], minify: true
      .on 'error', logError
      .pipe gulp.dest 'bin/test'

gulp.task 'test', ['test-compile'], ->
  gulp.src 'test/runner.html'
      .pipe mochaPhantomJS({reporter: 'spec'})
      .on 'error', logError

gulp.task 'watch', ->
  livereload.listen()
  gulp.watch '*/**/*.html', ['wet', 'test']
  gulp.watch 'src/**/*', ['wet', 'test']
  gulp.watch 'test/**/*', ['test']

# gulp build
gulp.task 'build', ->
  del.sync('dist')
  gulp.src("src/wet.js", {})
      .pipe browserify
        debug: true
        transform: stringify
          extensions: ['.html'], minify: true
      .pipe uglify()
      .pipe rename("wet-#{pkg.version}.min.js")
      .pipe gulp.dest 'dist'

gulp.task 'connect', ->
  connect.server()

gulp.task 'default', [
  'clean'
  'wet'
  'connect'
  'test'
  'watch'
]
