@echo off
echo Syncing photo directories to local dev server data...
npm run index
npm run chunk-data
echo Sync complete!
