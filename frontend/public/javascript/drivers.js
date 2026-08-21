(function () {
let currentArchiveDriverId = null;
        let currentEditDriverId = null;
        let currentPage = 1;
        let archivedDrivers = [];

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

        // Search functionality - using event delegation for React re-renders
        document.addEventListener('input', function(e) {
            if (e.target && e.target.id === 'driverSearch') {
                const searchTerm = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('.driver-row');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            }
        });

        let toastTimeout = null;
        let toastUndoAction = null;
        let lastArchivedDriver = null;

        function showToast(message, options = {}) {
            const toast = document.getElementById('toastNotification');
            const toastText = document.getElementById('toastText');
            const undoButton = document.getElementById('toastUndoButton');
            if (!toast || !toastText) return;

            toastText.textContent = message;
            toastUndoAction = typeof options.onUndo === 'function' ? options.onUndo : null;

            if (undoButton) {
                if (options.showUndo) {
                    undoButton.style.display = 'inline-flex';
                } else {
                    undoButton.style.display = 'none';
                }
            }

            toast.classList.add('show');

            if (toastTimeout) clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                hideToast();
            }, 5000);
        }

        function hideToast() {
            const toast = document.getElementById('toastNotification');
            const undoButton = document.getElementById('toastUndoButton');
            if (toast) toast.classList.remove('show');
            if (undoButton) {
                undoButton.style.display = 'none';
            }
            if (toastTimeout) {
                clearTimeout(toastTimeout);
                toastTimeout = null;
            }
            toastUndoAction = null;
        }

        function undoToastAction() {
            if (typeof toastUndoAction === 'function') {
                toastUndoAction();
            }
            hideToast();
        }

        // Sort dropdown toggle
        function toggleSortMenu() {
            // Placeholder for sort functionality
            showToast('Sort options: Name, Status, Contract Date');
        }

        // Pagination
        function changePage(direction) {
            const pageEl = document.getElementById('currentPage');
            if (!pageEl) return;
            let newPage = parseInt(pageEl.textContent) + direction;
            if (newPage < 1) newPage = 1;
            pageEl.textContent = newPage;
        }

        // Add Driver Modal
        function openAddDriverModal() {
            currentEditDriverId = null;
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) modalTitle.textContent = 'ADD NEW DRIVER';
            const form = document.getElementById('driverForm');
            if (form) form.reset();
            const addSection = document.getElementById('addDriverProfileSection');
            const editSection = document.getElementById('editDriverProfileSection');
            const cancelBtn = document.getElementById('driverModalCancelBtn');
            const submitBtn = document.getElementById('driverModalSubmitBtn');
            if (addSection) addSection.style.display = 'flex';
            if (editSection) editSection.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
            if (submitBtn) submitBtn.textContent = 'Save Changes';
            const modal = document.getElementById('driverModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }

        function openEditModal(driverId) {
            currentEditDriverId = driverId;
            const row = document.querySelector(`tr[data-driver-id="${driverId}"]`);
            if (!row) return;

            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) modalTitle.textContent = 'EDIT DRIVER';
            const addSection = document.getElementById('addDriverProfileSection');
            const editSection = document.getElementById('editDriverProfileSection');
            const cancelBtn = document.getElementById('driverModalCancelBtn');
            const submitBtn = document.getElementById('driverModalSubmitBtn');
            if (addSection) addSection.style.display = 'none';
            if (editSection) editSection.style.display = 'flex';
            const firstName = document.getElementById('firstName'); if (firstName) firstName.value = row.dataset.firstName || '';
            const middleName = document.getElementById('middleName'); if (middleName) middleName.value = row.dataset.middleName || '';
            const lastName = document.getElementById('lastName'); if (lastName) lastName.value = row.dataset.lastName || '';
            const birthdate = document.getElementById('birthdate'); if (birthdate) birthdate.value = row.dataset.birthdate || '';
            const contactNum = document.getElementById('contactNum'); if (contactNum) contactNum.value = row.dataset.contact || '';
            const editPhoto = document.getElementById('editDriverModalPhoto'); if (editPhoto) editPhoto.src = row.dataset.photo || 'images/brucednegrow.png';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
            if (submitBtn) submitBtn.textContent = 'Save Changes';
            const username = document.getElementById('driverUsername'); if (username) username.value = row.dataset.username || ('Driver' + driverId.replace('DR', '') + '_' + (row.dataset.lastName || ''));
            const password = document.getElementById('driverPassword'); if (password) password.value = 'password123';
            const confirmPassword = document.getElementById('confirmPassword'); if (confirmPassword) confirmPassword.value = 'password123';
            const email = document.getElementById('driverEmail'); if (email) email.value = row.dataset.email || '';
            const licenseNumber = document.getElementById('licenseNumber'); if (licenseNumber) licenseNumber.value = row.dataset.licenseNo || '';
            const licenseType = document.getElementById('licenseType'); if (licenseType) licenseType.value = row.dataset.licenseType || '';
            const licenseDateIssued = document.getElementById('licenseDateIssued'); if (licenseDateIssued) licenseDateIssued.value = row.dataset.dateIssued || '';
            const licenseDateExpiry = document.getElementById('licenseDateExpiry'); if (licenseDateExpiry) licenseDateExpiry.value = row.dataset.expiryDate || '';
            const authorizedBy = document.getElementById('authorizedBy'); if (authorizedBy) authorizedBy.value = row.dataset.authorized || '';
            const restrictionCode = document.getElementById('restrictionCode'); if (restrictionCode) restrictionCode.value = row.dataset.restriction || '';
            const healthCondition = document.getElementById('healthCondition'); if (healthCondition) healthCondition.value = row.dataset.healthCondition || '';
            const lastMedicalCheck = document.getElementById('lastMedicalCheck'); if (lastMedicalCheck) lastMedicalCheck.value = row.dataset.lastMedical || '';
            const prescriptionsEl = document.getElementById('prescriptions'); if (prescriptionsEl) prescriptionsEl.value = row.dataset.prescriptions || '';
            const existingConditions = document.getElementById('existingConditions'); if (existingConditions) existingConditions.value = row.dataset.conditions || '';

            const modal = document.getElementById('driverModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }

        function toggleDriverPassword() {
            const passwordInput = document.getElementById('driverPassword');
            const toggleIcon = document.getElementById('togglePassword');
            if (!passwordInput || !toggleIcon) return;
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            }
        }

        function closeDriverModal() {
            const modal = document.getElementById('driverModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }

        function saveDriver() {
            const firstNameEl = document.getElementById('firstName');
            const lastNameEl = document.getElementById('lastName');
            const contactNumEl = document.getElementById('contactNum');
            const usernameEl = document.getElementById('driverUsername');
            const passwordEl = document.getElementById('driverPassword');
            const confirmPasswordEl = document.getElementById('confirmPassword');
            const emailEl = document.getElementById('driverEmail');
            const firstName = firstNameEl ? firstNameEl.value : '';
            const lastName = lastNameEl ? lastNameEl.value : '';
            const contactNum = contactNumEl ? contactNumEl.value : '';
            const username = usernameEl ? usernameEl.value : '';
            const password = passwordEl ? passwordEl.value : '';
            const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value : '';
            const email = emailEl ? emailEl.value : '';

            if (!firstName || !lastName || !contactNum || !username || !password || !email) {
                showToast('Please fill in all required fields.');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match.');
                return;
            }

            if (currentEditDriverId) {
                showToast('Driver updated successfully!');
            } else {
                showToast('New driver added successfully!');
            }
            closeDriverModal();
        }

        // Archive Modal
        function archiveDriver(driverId) {
            currentArchiveDriverId = driverId;
            const row = document.querySelector(`tr[data-driver-id="${driverId}"]`);
            const name = row ? row.dataset.name : 'this driver';
            const nameEl = document.getElementById('archiveDriverName');
            if (nameEl) nameEl.textContent = name;
            const modal = document.getElementById('archiveModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeArchiveModal() {
            const modal = document.getElementById('archiveModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            currentArchiveDriverId = null;
        }

        function confirmArchive() {
            if (currentArchiveDriverId) {
                const row = document.querySelector(`tr[data-driver-id="${currentArchiveDriverId}"]`);
                if (row) {
                    const driverData = {
                        id: currentArchiveDriverId,
                        name: row.dataset.name,
                        status: row.dataset.status,
                        contract: row.dataset.contract,
                        contact: row.dataset.contact,
                        rowElement: row
                    };
                    archivedDrivers.push(driverData);
                    lastArchivedDriver = driverData;
                    row.style.display = 'none';
                    const archivesSection = document.getElementById('archivesSection');
                    if (archivesSection && archivesSection.style.display === 'block') {
                        renderArchives();
                    }
                }
                closeArchiveModal();
                showToast('Driver archived successfully!', {
                    showUndo: true,
                    onUndo: undoLastArchive
                });
            }
        }

        function undoLastArchive() {
            if (!lastArchivedDriver) return;

            const index = archivedDrivers.findIndex(d => d.id === lastArchivedDriver.id);
            if (index !== -1) {
                archivedDrivers.splice(index, 1);
            }

            if (lastArchivedDriver.rowElement) {
                lastArchivedDriver.rowElement.style.display = '';
            }

            const archivesSection = document.getElementById('archivesSection');
            if (archivesSection && archivesSection.style.display === 'block') {
                renderArchives();
            }

            lastArchivedDriver = null;
        }

        function showIncidents() {
            const driversSection = document.getElementById('driversSection');
            const archivesSection = document.getElementById('archivesSection');
            const incidentsSection = document.getElementById('incidentsSection');
            const stats = document.querySelector('.driver-stats');
            if (driversSection) driversSection.style.display = 'none';
            if (archivesSection) archivesSection.style.display = 'none';
            if (incidentsSection) incidentsSection.style.display = 'block';
            if (stats) stats.style.display = 'none';
        }

        function showArchives() {
            const driversSection = document.getElementById('driversSection');
            const archivesSection = document.getElementById('archivesSection');
            if (driversSection) driversSection.style.display = 'none';
            if (archivesSection) archivesSection.style.display = 'block';
            renderArchives();
        }

        function showDrivers() {
            const incidentsSection = document.getElementById('incidentsSection');
            const archivesSection = document.getElementById('archivesSection');
            const driversSection = document.getElementById('driversSection');
            const stats = document.querySelector('.driver-stats');
            if (incidentsSection) incidentsSection.style.display = 'none';
            if (archivesSection) archivesSection.style.display = 'none';
            if (driversSection) driversSection.style.display = 'block';
            if (stats) stats.style.display = 'grid';
        }

        function renderArchives() {
            const tbody = document.getElementById('archivesTableBody');
            const emptyState = document.getElementById('archivesEmptyState');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (archivedDrivers.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
            } else {
                if (emptyState) emptyState.style.display = 'none';
                archivedDrivers.forEach(driver => {
                    const tr = document.createElement('tr');
                    tr.className = 'driver-row';
                    const statusClass = (driver.status || '').toLowerCase().replace(' ', '-');
                    tr.innerHTML = `
                        <td class="driver-id">${driver.id}</td>
                        <td>${driver.name}</td>
                        <td><span class="driver-status ${statusClass}"><i class="fas fa-circle"></i> ${driver.status}</span></td>
                        <td>${driver.contract}</td>
                        <td>${driver.contact}</td>
                        <td class="action-cell">
                            <button class="btn-return-driver" onclick="event.stopPropagation(); returnDriver('${driver.id}')">Return</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        function returnDriver(driverId) {
            const index = archivedDrivers.findIndex(d => d.id === driverId);
            if (index !== -1) {
                const driver = archivedDrivers[index];
                if (driver.rowElement) {
                    driver.rowElement.style.display = '';
                }
                archivedDrivers.splice(index, 1);
                renderArchives();
                showToast('Driver returned successfully!');
            }
        }

        function toggleArchivesSortMenu() {
            // Sort menu functionality
        }

        function exportArchives() {
            // Export functionality
        }

        function changeArchivesPage(direction) {
            const pageEl = document.getElementById('archivesCurrentPage');
            if (!pageEl) return;
            let newPage = parseInt(pageEl.textContent) + direction;
            if (newPage < 1) newPage = 1;
            pageEl.textContent = newPage;
        }

        // Safe helpers for setting DOM content without null errors
        function setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '—';
        }
        function setSrc(id, value) {
            const el = document.getElementById(id);
            if (el) el.src = value || 'images/brucednegrow.png';
        }

        // Driver Details Modal - Figma Design
        function openDriverDetails(driverId) {
            const row = document.querySelector(`tr[data-driver-id="${driverId}"]`);
            if (!row) return;

            setSrc('detailsPhoto', row.dataset.photo);
            setText('detailsName', row.dataset.name);
            setText('detailsId', driverId);
            setText('detailsPhone', row.dataset.contact);

            // Rating with review count
            const rating = parseInt(row.dataset.rating) || 0;
            const reviews = parseInt(row.dataset.reviews) || 0;
            const ratingContainer = document.getElementById('detailsRating');
            const ratingCountEl = document.getElementById('detailsRatingCount');
            if (ratingContainer) {
                ratingContainer.innerHTML = '';
                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('i');
                    star.className = i <= rating ? 'fas fa-star' : 'far fa-star';
                    ratingContainer.appendChild(star);
                }
            }
            if (ratingCountEl) {
                ratingCountEl.textContent = `${rating} (${reviews} Reviews)`;
            }

            // Contract Info
            const fromLabel = document.getElementById('detailsContractFromLabel');
            const untilLabel = document.getElementById('detailsContractUntilLabel');
            if (fromLabel) fromLabel.textContent = `Valid from: ${row.dataset.contractFrom || '—'}`;
            if (untilLabel) untilLabel.textContent = `Valid until: ${row.dataset.contractUntil || '—'}`;

            // Status with colored dot
            const status = row.dataset.status || 'Active';
            const statusValueEl = document.getElementById('detailsStatus');
            const statusDotEl = document.querySelector('.info-status-dot');
            if (statusValueEl) {
                statusValueEl.textContent = status;
                statusValueEl.className = 'info-value';
                if (statusDotEl) {
                    statusDotEl.className = 'status-dot info-status-dot';
                }
                if (status === 'On Delivery') {
                    if (statusDotEl) statusDotEl.classList.add('on-delivery');
                    statusValueEl.classList.add('status-on-delivery');
                } else if (status === 'Available') {
                    if (statusDotEl) statusDotEl.classList.add('available');
                    statusValueEl.classList.add('status-available');
                } else if (status === 'Inactive') {
                    if (statusDotEl) statusDotEl.classList.add('inactive');
                    statusValueEl.classList.add('status-inactive');
                } else if (status === 'Resigned') {
                    if (statusDotEl) statusDotEl.classList.add('resigned');
                    statusValueEl.classList.add('status-resigned');
                }
            }

            // Date Hired & Hired By
            setText('detailsDateHired', row.dataset.dateHired);
            setText('detailsHiredBy', row.dataset.hiredBy);

            // Personal Information
            setText('detailsFirstName', row.dataset.firstName);
            setText('detailsMiddleName', row.dataset.middleName);
            setText('detailsLastName', row.dataset.lastName);
            setText('detailsBirthdate', row.dataset.birthdate);
            setText('detailsNationality', row.dataset.nationality);

            // Health Information
            setText('detailsHealthCondition', row.dataset.healthCondition);
            setText('detailsLastMedical', row.dataset.lastMedical);
            const prescriptionsEl = document.getElementById('detailsPrescriptions');
            if (prescriptionsEl) prescriptionsEl.textContent = row.dataset.prescriptions || 'N/A';
            const conditionsEl = document.getElementById('detailsConditions');
            if (conditionsEl) conditionsEl.textContent = row.dataset.conditions || 'N/A';

            // License Information
            setText('detailsLicenseNo', row.dataset.licenseNo);
            setText('detailsLicenseType', row.dataset.licenseType);
            const restrictionEl = document.getElementById('detailsRestriction');
            if (restrictionEl) restrictionEl.textContent = row.dataset.restriction || 'None';
            setText('detailsDateIssued', row.dataset.dateIssued);
            setText('detailsExpiryDate', row.dataset.expiryDate);
            setText('detailsAuthorized', row.dataset.authorized);

            // Driver Performance
            setText('detailsCompletedTrips', row.dataset.deliveries || '0');
            setText('detailsDeclinedAssignments', row.dataset.declined || '0');
            setText('detailsAcceptedAssignments', row.dataset.accepted || '0');

            // History of Offenses
            const overspeeding = parseInt(row.dataset.overspeeding) || 0;
            const lateArrival = parseInt(row.dataset.lateArrival) || 0;
            const trafficViolations = parseInt(row.dataset.trafficViolations) || 0;
            const accidents = parseInt(row.dataset.accidents) || 0;
            setText('detailsOverspeeding', String(overspeeding));
            setText('detailsLateArrival', String(lateArrival));
            setText('detailsTrafficViolations', String(trafficViolations));
            setText('detailsAccidents', String(accidents));

            // Good Driver Record Badge
            const goodRecordBadge = document.getElementById('detailsGoodRecordBadge');
            if (goodRecordBadge) {
                const totalOffenses = overspeeding + lateArrival + trafficViolations + accidents;
                goodRecordBadge.style.display = totalOffenses === 0 ? 'flex' : 'none';
            }

            const modal = document.getElementById('driverDetailsModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeDriverDetails() {
            const modal = document.getElementById('driverDetailsModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }

        // Driver Details Modal - click handler via event delegation
        // Instead of attaching to each row individually, we use a single document listener
        // that catches clicks on any .driver-row — this works even when React
        // re-renders rows after tab switches.
        document.addEventListener('click', function(e) {
            const editBtn = e.target.closest('.btn-edit-info');
            if (editBtn) {
                e.stopPropagation();
                const row = editBtn.closest('tr[data-driver-id]');
                if (row && row.dataset.driverId) {
                    openEditModal(row.dataset.driverId);
                }
                return;
            }

            const archiveBtn = e.target.closest('.btn-archive');
            if (archiveBtn) {
                e.stopPropagation();
                const row = archiveBtn.closest('tr[data-driver-id]');
                if (row && row.dataset.driverId) {
                    archiveDriver(row.dataset.driverId);
                }
                return;
            }

            const row = e.target.closest('.driver-row');
            if (!row) return;
            if (e.target.closest('.action-cell')) return;
            const driverId = row.dataset.driverId;
            if (driverId) {
                openDriverDetails(driverId);
            }
        });

        // Archives search and incidents — also via event delegation.
        document.addEventListener('input', function(e) {
            if (e.target && e.target.id === 'archivesSearch') {
                const searchTerm = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#archivesTableBody .driver-row');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            }
            if (e.target && e.target.id === 'incidentsSearch') {
                    filterIncidents();
            }
        });

        document.addEventListener('change', function(e) {
            if (e.target && (e.target.id === 'incidentDriverFilter' || e.target.id === 'incidentStatusFilter' || e.target.id === 'incidentDateFilter')) {
                filterIncidents();
            }
        });

        document.addEventListener('click', function(e) {
            const tab = e.target.closest('.incident-tab');
            if (!tab) return;
            document.querySelectorAll('.incident-tab').forEach(btn => btn.classList.remove('active'));
            tab.classList.add('active');
            filterIncidents();
        });

        function filterIncidents() {
            const incidentSearch = document.getElementById('incidentsSearch');
            const incidentTabs = document.querySelectorAll('.incident-tab');
            const incidentRows = document.querySelectorAll('.incident-row');
            const incidentDriverFilter = document.getElementById('incidentDriverFilter');
            const incidentStatusFilter = document.getElementById('incidentStatusFilter');
            const incidentDateFilter = document.getElementById('incidentDateFilter');

            const searchTerm = incidentSearch ? incidentSearch.value.toLowerCase() : '';
            const activeTab = document.querySelector('.incident-tab.active');
            const activeType = activeTab ? activeTab.textContent.trim() : 'All';
            const selectedDriver = incidentDriverFilter ? incidentDriverFilter.value : 'All Drivers';
            const selectedStatus = incidentStatusFilter ? incidentStatusFilter.value : 'All Status';
            const selectedDate = incidentDateFilter ? incidentDateFilter.value : 'Today';
            let visibleRows = 0;

            incidentRows.forEach((row) => {
                const rowType = row.dataset.incidentType;
                const rowDriver = row.dataset.incidentDriver;
                const rowDateGroup = row.dataset.incidentDateGroup;
                const inSearch = row.textContent.toLowerCase().includes(searchTerm);
                const inType = activeType === 'All' || rowType === activeType;
                const inDriver = selectedDriver === 'All Drivers' || rowDriver === selectedDriver;
                const inStatus = selectedStatus === 'All Status' || rowType === selectedStatus;
                const inDate = selectedDate === 'Today' || rowDateGroup === selectedDate;
                const show = inSearch && inType && inDriver && inStatus && inDate;
                row.style.display = show ? 'grid' : 'none';
                if (show) visibleRows += 1;
            });

            const countEl = document.querySelector('.incident-count');
            if (countEl) {
                countEl.textContent = `Showing ${visibleRows} of ${incidentRows.length}.`;
            }
        }

        // Run filterIncidents() will be called lazily when incidents section is shown
        // but also ensure it runs once elements exist
        let filterInitAttempts = 0;
        const filterInitInterval = setInterval(() => {
            filterInitAttempts++;
            if (document.getElementById('incidentsSearch')) {
                filterIncidents();
                clearInterval(filterInitInterval);
            }
            if (filterInitAttempts > 20) {
                clearInterval(filterInitInterval);
            }
        }, 500);

        // Close modals on outside click
        window.addEventListener('click', function(event) {
            const driverModal = document.getElementById('driverModal');
            const archiveModal = document.getElementById('archiveModal');
            const detailsModal = document.getElementById('driverDetailsModal');
            if (driverModal && event.target === driverModal) {
                closeDriverModal();
            }
            if (archiveModal && event.target === archiveModal) {
                closeArchiveModal();
            }
            if (detailsModal && event.target === detailsModal) {
                closeDriverDetails();
            }
        });

        function bindDriverPageGlobals() {
            window.openEditModal = openEditModal;
            window.openDriverEditModal = openEditModal;
        }

        bindDriverPageGlobals();

        Object.assign(window, {
            toggleSortMenu,
            showIncidents,
            showArchives,
            showDrivers,
            openAddDriverModal,
            openEditModal,
            openDriverEditModal: openEditModal,
            bindDriverPageGlobals,
            openDriverDetails,
            archiveDriver,
            changePage,
            toggleArchivesSortMenu,
            exportArchives,
            changeArchivesPage,
            closeDriverModal,
            toggleDriverPassword,
            saveDriver,
            closeDriverDetails,
            closeArchiveModal,
            confirmArchive,
            undoToastAction,
            returnDriver,
        });
})();