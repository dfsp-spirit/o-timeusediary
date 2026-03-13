This is the Javascript frontend of the Time Use Diary (TUD) research app for the collection of time use data from participants in online studies.

A Python/FastApi backend for this app can be found at https://github.com/dfsp-spirit/o-timeusediary-backend.

Users of the frontend see an instructions page followed by the data collection page. On the data collection page, users can select the activities at the bottom, and they see one or more timelines at the top, e.g., a 'primary activity' timeline and a 'secondary activity' timeline. Users place activities on timelines to indicate what they have been doing during the day. They click on an activity to select it, and then click on the timeline to place the activity on the timeline. The activity can be moved and resized on the timeline. The timeline is divided into 10-minute intervals and covers one entire day.

The app can support several studies, defined in file `src/settings/studies_config.json`. Each study can be open to everyone (e.g., for sending invitation to a mailing list), or only to listed participants who need to know their ID or invitation link including this ID. For each study, a separate list of activites is available in an activities JSON file, the exact file is defined for each study in the `studies_config.json` file.

In production, the frontend will receive the list of studies and the activities for each study from the backend, but for development purposes, the frontend can also load this information from local JSON files in the `src/settings` directory.

A study may cover more than a single day, e.g., a full week. When the user has filled out all timelines of one day, they can click a button to go to the next day. The app will save the data to the backend after each day.

If a user has already filled out some data for a day, the data they entered will be loaded from the backend when they return to the app, and they can continue editing it. If the user has already filled out data for at least one day and switches to the next day, and the database does not hold any information yet for the next day, the app will copy the data from the previous day to the next day as a template, so that users can easily make adjustments to the previous day's data instead of starting from scratch.

The app is built in pure JavaScript, without any frontend framework or build tool. There is a settings file `src/settings/tud_settings.json` that defines app-wide settings, e.g., the backend URL. The entire frontend is in the `src` directory. The `dev_tools` directory contains some tools for development.

The frontend supports both a mobile and a desktop view, and there are two different rendering paths for the two in the code: in desktop view, the timelines are rendered horizontally, and in mobile view, the timelines are rendered vertically. The app automatically detects whether the user is on a mobile or desktop device based on screen width and renders the appropriate view.

Note that this repo was forked from another project, but the code on our branch (mpiae_adapt) has been heavily modified, and we do not intend to merge it back to the original repo or the main branch, it has diverged too much. So you should consider mpiae_adapt as the branch that is typically called main or master.