export default defineBackground(() => {
    // Open the Navi side panel when the toolbar action is clicked.
    browser.sidePanel
        ?.setPanelBehavior({ openPanelOnActionClick: true })
        .catch(err => console.error("Failed to set side panel behavior", err));
});
