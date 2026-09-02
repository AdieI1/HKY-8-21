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

        // Assignment Panel Functions
        function openAssignPanel(button) {
            if (!button) {
                console.error('openAssignPanel: button element is undefined');
                return;
            }
            const row = button.closest('tr');
            if (!row) {
                console.error('openAssignPanel: could not find parent <tr> from button');
                return;
            }
            document.getElementById('panelRequestId').textContent = row.dataset.requestId || '';
            document.getElementById('panelCustomerName').textContent = row.dataset.customer || '';
            document.getElementById('panelContact').textContent = 'Contact Number: ' + (row.dataset.contact || '');
            document.getElementById('panelCargoType').textContent = row.dataset.cargoType || '';
            document.getElementById('panelCargoWeight').textContent = row.dataset.cargoWeight || '';
            document.getElementById('panelCargoFragility').textContent = row.dataset.cargoFragility || '';
            document.getElementById('panelPickup').textContent = row.dataset.pickup || '';
            document.getElementById('panelDropoff').textContent = row.dataset.dropoff || '';
            document.getElementById('panelDistance').textContent = row.dataset.distance || '';

            document.getElementById('assignPanel').classList.add('active');
            document.getElementById('panelOverlay').classList.add('active');
            document.body.classList.add('panel-open');
        }

        function closeAssignPanel() {
            const panel = document.getElementById('assignPanel');
            const overlay = document.getElementById('panelOverlay');
            if (panel) panel.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.classList.remove('panel-open');
        }

        function changePage(direction) {
            const pageNumberEl = document.querySelector('.dispatch-pagination .page-number');
            if (!pageNumberEl) return;
            let currentPage = parseInt(pageNumberEl.textContent);
            if (isNaN(currentPage)) currentPage = 1;
            currentPage += direction;
            if (currentPage < 1) currentPage = 1;
            pageNumberEl.textContent = currentPage;
        }

        function dispatchDelivery() {
            const driver = document.getElementById('assignDriver');
            const vehicle = document.getElementById('assignVehicle');
            const driverVal = driver ? driver.value : '';
            const vehicleVal = vehicle ? vehicle.value : '';

            if (!driverVal) {
                alert('Please select a driver.');
                return;
            }
            if (!vehicleVal) {
                alert('Please select a vehicle.');
                return;
            }

            if (driver) driver.value = '';
            if (vehicle) vehicle.value = '';
            closeAssignPanel();
            const modal = document.getElementById('dispatchSuccessModal');
            if (modal) {
                modal.classList.add('active');
                setTimeout(() => {
                    modal.classList.remove('active');
                }, 5000);
            }
        }

        Object.assign(window, {
            openAssignPanel,
            closeAssignPanel,
            changePage,
            dispatchDelivery,
        });
})();
