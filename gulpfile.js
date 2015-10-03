
var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    gutil = require('gulp-util'),
    ts = require('gulp-typescript');

var tsProject = ts.createProject('tsconfig.json');
gulp.task('typescript', function() {
  return tsProject.src()
             .pipe(ts(tsProject))
             .pipe(gulp.dest('.'))
});

gulp.task('mocha', function () {
  return gulp.src('test/*.js', { read: false })
             .pipe(mocha({ reporter: 'list' }))

});

gulp.task('watch-mocha', function () {
  return gulp.watch(['*.js', 'test/**'], ['mocha']);
});
