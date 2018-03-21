var gulp = require('gulp'),
    sass = require('gulp-sass'),
    plumber = require("gulp-plumber"),
    csso = require('gulp-csso'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    rename = require('gulp-rename'),
    browserSync = require('browser-sync'),
    del = require('del'),
    sourcemaps = require('gulp-sourcemaps');

gulp.task('sass', function() {
  return gulp.src('sass/style.scss')
    .pipe(plumber())
    .pipe(sourcemaps.init())
      .pipe(sass())
      .pipe(postcss([ autoprefixer() ]))
      .pipe(csso())
    .pipe(sourcemaps.write())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('css'))
    .pipe(browserSync.reload({ stream: true }))
});

gulp.task('browser-sync', function() {
  browserSync({
      server: {
          baseDir: '.'
      },
      notify: false
  });
});

gulp.task('watch', ['browser-sync', 'sass'], function() {
  gulp.watch('sass/**/*.scss', ['sass']);
  gulp.watch('*.html', browserSync.reload);
  gulp.watch('js/**/*.js', browserSync.reload);
});

gulp.task('clean', function() {
  return del.sync('dist');
});

gulp.task('build', ['clean', 'sass'], function() {
  var buildCss = gulp.src('css/style.min.css')
  .pipe(gulp.dest('dist/css'))

  var buildJs = gulp.src('js/**/*')
  .pipe(gulp.dest('dist/js'))

  var buildHtml = gulp.src('*.html')
  .pipe(gulp.dest('dist'));
});