#!/bin/bash

echo "🚀 Preparing SDK Deployment 🚀"

echo ""
echo -e "\e[34mCommiting any changes made before bumping the version\e[0m"
git add .
git commit -m "Prepare deployment"

echo ""
echo -e "\e[34mBumping the version\e[0m"
npm version patch

echo ""
echo -e "\e[34mPushing the changes to the main branch\e[0m"
git add .
git commit -m "Bump version"
git push origin main

npm install
npm run bundle
npm publish

echo ""
echo -e "\e[32mDeployment completed successfully 🚀🚀🚀\e[0m"
exit 0
