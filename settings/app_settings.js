// Application settings for TUD frontend.

const TUD_SETTINGS = {
    API_BASE_URL: 'http://localhost:8000',
    ALLOW_NO_UID: true,  // Whether to allow access without user ID in link, and map to a new random user.
    STUDY_NAME: 'default',  // Name of the study, gets send to backend in metadata.
    DAILY_ENTRY_NAMES: ['Typical day'],  // Name(s) of the entries/record(s) users submit. E.g., if you collect for one week, could be "Monday", "Tuesday", etc. If you collect for a typical day, just "default". The length of this array determines how many forms a user will fill out, and each form will be labeled with a name from this list. TODO: We could get this from the backend for a study. These names are not send to the backend, only an index is sent.
};