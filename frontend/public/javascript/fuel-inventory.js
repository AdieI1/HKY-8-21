(function () {
    function updateDate() {
        const now = new Date();
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const dateString = now.toLocaleDateString('en-PH', options);
        const dateElement = document.querySelector('.date-picker span');
        if (dateElement) {
            dateElement.textContent = dateString;
        }
    }

    updateDate();
    setInterval(updateDate, 60000);

    const fuelSearch = document.getElementById('fuelSearch');
    if (fuelSearch) {
        fuelSearch.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('.fuel-row');
            rows.forEach(function (row) {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    const issuanceTabs = document.getElementById('issuanceTabs');
    if (issuanceTabs) {
        issuanceTabs.addEventListener('click', function (e) {
            const tab = e.target.closest('.history-tab');
            if (!tab) return;

            issuanceTabs.querySelectorAll('.history-tab').forEach(function (btn) {
                btn.classList.remove('active');
            });
            tab.classList.add('active');
        });
    }

    const fuelPrevPage = document.getElementById('fuelPrevPage');
    const fuelNextPage = document.getElementById('fuelNextPage');
    const fuelCurrentPage = document.getElementById('fuelCurrentPage');

    function changeFuelPage(direction) {
        if (!fuelCurrentPage) return;
        let page = parseInt(fuelCurrentPage.textContent, 10) + direction;
        if (page < 1) page = 1;
        fuelCurrentPage.textContent = page;
    }

    if (fuelPrevPage) {
        fuelPrevPage.addEventListener('click', function () {
            changeFuelPage(-1);
        });
    }

    if (fuelNextPage) {
        fuelNextPage.addEventListener('click', function () {
            changeFuelPage(1);
        });
    }

    const receiveFuelBtn = document.getElementById('receiveFuelBtn');
    if (receiveFuelBtn) {
        receiveFuelBtn.addEventListener('click', function () {
            alert('Receive Fuel form coming soon.');
        });
    }

    const printReportBtn = document.getElementById('printReportBtn');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', function () {
            window.print();
        });
    }

    const fuelSortDropdown = document.getElementById('fuelSortDropdown');
    if (fuelSortDropdown) {
        fuelSortDropdown.addEventListener('click', function () {
            const sortValue = fuelSortDropdown.querySelector('.sort-value');
            if (!sortValue) return;

            const options = ['Fuel Type', 'Current Stock', 'Last Delivery', 'Status'];
            const currentIndex = options.indexOf(sortValue.textContent);
            const nextIndex = (currentIndex + 1) % options.length;
            sortValue.textContent = options[nextIndex];
        });
    }
})();
