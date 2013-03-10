#!/bin/sh
pack_dir=$(egrep -m 1 -o "Ver\. [.0-9]+" changelog.html | sed -e "s/Ver\. /..\/hiki2mw-/")
pack_dir=${pack_dir}/
# echo $pack_dir

mkdir $pack_dir
echo "Made directory $pack_dir"

cp *.html $pack_dir
echo "Copied HTML files into $pack_dir"
echo

css_dir=${pack_dir}css/
mkdir $css_dir
echo "Made directory $css_dir"
cp css/*.css $css_dir
echo "Copied CSS files into $css_dir"
echo

img_dir=${pack_dir}img/
mkdir $img_dir
echo "Made directory $img_dir"
cp img/*.{gif,jpg,png} $img_dir
echo "Copied image files into $img_dir"
echo

js_dir=${pack_dir}js/
mkdir $js_dir
echo "Made directory $js_dir"
cp js/*.js $js_dir
echo "Copied JavaScript Files into $js_dir"
echo

echo "Packing completed!"
