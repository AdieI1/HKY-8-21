(function initNavGroups() {
    if (window.__hjyNavInitialized) return;
    window.__hjyNavInitialized = true;

    const STORAGE_KEY = 'hjy_inventory_group_expanded';

    function readExpandedState() {
        let expanded = true;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) expanded = saved === 'true';
        } catch (e) {}
        return expanded;
    }

    function writeExpandedState(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
        } catch (e) {}
    }

    function applySavedState() {
        const expanded = readExpandedState();
        document.querySelectorAll('.nav-group').forEach(function (group) {
            if (expanded) group.classList.add('expanded');
            else group.classList.remove('expanded');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySavedState);
    } else {
        applySavedState();
    }

    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function () {
            if (document.querySelectorAll('.nav-group').length > 0) applySavedState();
        });
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }

    document.addEventListener('click', function (e) {
        const label = e.target.closest('.nav-group-label');
        if (!label) return;
        const group = label.parentElement;
        if (!group || !group.classList.contains('nav-group')) return;

        e.preventDefault();
        e.stopPropagation();

        const isNowExpanded = !group.classList.contains('expanded');
        group.classList.toggle('expanded', isNowExpanded);
        writeExpandedState(isNowExpanded);
    });
})();
