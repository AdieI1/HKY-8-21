(function initVehiclesPage() {
    if (window.__hjyVehiclesInitialized) return;
    window.__hjyVehiclesInitialized = true;

    const archivedVehicles = [];
    let activeRow = null;
    let isAddMode = false;
    let nextVehicleNumber = 7;

    function updateDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-PH', {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dateElement = document.querySelector('.date-picker span');
        if (dateElement) dateElement.textContent = dateString;
    }

    updateDate();
    setInterval(updateDate, 60000);

    function statusClass(statusText) {
        if (statusText === 'Available') return 'available';
        if (statusText === 'Under Maintenance') return 'maintenance';
        if (statusText === 'Broken') return 'broken';
        if (statusText === 'Decommissioned') return 'decommissioned';
        return 'in-use';
    }

    function conditionClass(conditionText, statusText) {
        if (conditionText === 'Irreparable' || statusText === 'Broken') return 'condition-irreparable';
        if (conditionText === 'Need Repair' || statusText === 'Under Maintenance') return 'condition-under-repair';
        return '';
    }

    function getEl(id) {
        return document.getElementById(id);
    }

    function showVehicleList() {
        const mainView = getEl('vehiclesMainView');
        const archivesSection = getEl('vehicleArchivesSection');
        if (mainView) mainView.style.display = '';
        if (archivesSection) archivesSection.style.display = 'none';
    }

    function showVehicleArchives() {
        const mainView = getEl('vehiclesMainView');
        const archivesSection = getEl('vehicleArchivesSection');
        if (mainView) mainView.style.display = 'none';
        if (archivesSection) archivesSection.style.display = 'block';
        renderArchivesTable();
    }

    function renderArchivesTable() {
        const tbody = getEl('vehicleArchivesTableBody');
        const emptyState = getEl('vehicleArchivesEmpty');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (archivedVehicles.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        archivedVehicles.forEach(function (vehicle) {
            const row = document.createElement('tr');
            row.className = 'vehicle-row archived-row';
            row.dataset.vehicleId = vehicle.id;
            row.innerHTML =
                '<td class="vehicle-id">' + vehicle.id + '</td>' +
                '<td class="vehicle-model">' + vehicle.model + '</td>' +
                '<td><span class="vehicle-status decommissioned"><i class="fas fa-circle"></i> Decommissioned</span></td>' +
                '<td>' + vehicle.condition + '</td>' +
                '<td>' + vehicle.archivedOn + '</td>' +
                '<td class="action-cell"><div class="action-cell-inner">' +
                '<button class="btn-edit btn-restore-vehicle" type="button">Restore</button>' +
                '</div></td>';
            tbody.appendChild(row);
        });
    }

    function collectRowData(row) {
        return {
            id: row.dataset.vehicleId,
            model: row.cells[1].textContent.trim(),
            status: row.cells[2].innerText.trim(),
            condition: row.cells[3].textContent.trim(),
            lastMaintenance: row.cells[4].textContent.trim(),
            nextMaintenance: row.cells[5].textContent.trim(),
            dataset: Object.assign({}, row.dataset)
        };
    }

    function archiveVehicle(row) {
        if (!row) return;
        const vehicleId = row.dataset.vehicleId;
        const confirmed = window.confirm('Decommission ' + vehicleId + '? It will be moved to Archives.');
        if (!confirmed) return;

        const data = collectRowData(row);
        data.archivedOn = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        archivedVehicles.push(data);
        row.remove();
        closeVehicleDetails();
        renderArchivesTable();
    }

    function restoreVehicle(vehicleId) {
        const index = archivedVehicles.findIndex(function (v) { return v.id === vehicleId; });
        if (index === -1) return;

        const vehicle = archivedVehicles[index];
        archivedVehicles.splice(index, 1);

        const tbody = getEl('vehiclesTableBody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'vehicle-row';
        row.dataset.vehicleId = vehicle.id;
        Object.keys(vehicle.dataset).forEach(function (key) {
            row.dataset[key] = vehicle.dataset[key];
        });

        const statusClassName = statusClass('Available');
        row.innerHTML =
            '<td class="vehicle-id">' + vehicle.id + '</td>' +
            '<td class="vehicle-model">' + vehicle.model + '</td>' +
            '<td><span class="vehicle-status ' + statusClassName + '"><i class="fas fa-circle"></i> Available</span></td>' +
            '<td>Good</td>' +
            '<td>' + vehicle.lastMaintenance + '</td>' +
            '<td>' + vehicle.nextMaintenance + '</td>' +
            '<td class="action-cell"><div class="action-cell-inner">' +
            '<button class="btn-edit" type="button">Edit info</button>' +
            '<button class="btn-danger btn-decommission" type="button">Decommission</button>' +
            '</div></td>';
        tbody.appendChild(row);
        renderArchivesTable();
    }

    function openVehicleModal(row, addMode) {
        const modal = getEl('editVehicleModal');
        const overlay = getEl('vehicleModalOverlay');
        const title = getEl('editVehicleTitle');
        if (!modal || !overlay) return;

        isAddMode = !!addMode;
        activeRow = addMode ? null : row;

        const modalVehicleId = getEl('modalVehicleId');
        const modalVehicleModelTitle = getEl('modalVehicleModelTitle');
        const editVehicleModel = getEl('editVehicleModel');
        const editVehicleStatus = getEl('editVehicleStatus');
        const editVehicleCondition = getEl('editVehicleCondition');
        const editVehicleMaintenance = getEl('editVehicleMaintenance');

        if (title) title.textContent = addMode ? 'Add Vehicle' : 'Edit Vehicle';

        if (addMode) {
            const newId = 'VCL' + String(nextVehicleNumber++).padStart(3, '0');
            if (modalVehicleId) modalVehicleId.textContent = newId;
            if (modalVehicleModelTitle) modalVehicleModelTitle.textContent = 'Fuso FJ 2828R';
            if (editVehicleModel) editVehicleModel.value = 'Fuso FJ 2828R';
            if (editVehicleStatus) editVehicleStatus.value = 'Available';
            if (editVehicleCondition) editVehicleCondition.value = 'Good';
            if (editVehicleMaintenance) editVehicleMaintenance.value = '';
            modal.dataset.pendingId = newId;
        } else if (row) {
            const status = row.cells[2].innerText.trim();
            if (modalVehicleId) modalVehicleId.textContent = row.cells[0].innerText.trim();
            if (editVehicleModel) editVehicleModel.value = row.cells[1].innerText.trim();
            if (modalVehicleModelTitle) modalVehicleModelTitle.textContent = row.cells[1].innerText.trim();
            if (editVehicleStatus) editVehicleStatus.value = status;
            if (editVehicleCondition) editVehicleCondition.value = row.cells[3].innerText.trim();
            if (editVehicleMaintenance) {
                editVehicleMaintenance.value = row.cells[4].innerText.trim() === '--' ? '' : row.cells[4].innerText.trim();
            }
            delete modal.dataset.pendingId;
        }

        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeVehicleModal() {
        const modal = getEl('editVehicleModal');
        const overlay = getEl('vehicleModalOverlay');
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        activeRow = null;
        isAddMode = false;
    }

    function setText(id, value) {
        const el = getEl(id);
        if (el) el.textContent = value || '—';
    }

    function setSrc(id, value) {
        const el = getEl(id);
        if (el) el.src = value || 'images/truckkkk.jpg';
    }

    function openVehicleDetails(vehicleId) {
        const row = document.querySelector('tr[data-vehicle-id="' + vehicleId + '"]:not(.archived-row)');
        if (!row) return;

        setSrc('vehicleDetailsPhoto', row.dataset.vehicleImage);
        setText('vehicleDetailsModel', row.dataset.model);
        setText('vehicleDetailsId', vehicleId);
        setText('vehicleDetailsDriverId', row.dataset.driverId);
        setText('vehicleDetailsPhone', row.dataset.contact);

        const fromLabel = getEl('vehicleDetailsContractFrom');
        const untilLabel = getEl('vehicleDetailsContractUntil');
        if (fromLabel) fromLabel.textContent = 'Valid from: ' + (row.dataset.contractFrom || '—');
        if (untilLabel) untilLabel.textContent = 'Valid until: ' + (row.dataset.contractUntil || '—');

        const status = row.dataset.driverStatus || 'On Delivery';
        const statusValueEl = getEl('vehicleDetailsStatus');
        const statusDotEl = document.querySelector('#vehicleDetailsModal .info-status-dot');
        if (statusValueEl) {
            statusValueEl.textContent = status;
            statusValueEl.className = 'info-value';
            if (statusDotEl) statusDotEl.className = 'status-dot info-status-dot';
            if (status === 'On Delivery') {
                if (statusDotEl) statusDotEl.classList.add('on-delivery');
                statusValueEl.classList.add('status-on-delivery');
            } else if (status === 'Available') {
                if (statusDotEl) statusDotEl.classList.add('available');
                statusValueEl.classList.add('status-available');
            } else if (status === 'Inactive') {
                if (statusDotEl) statusDotEl.classList.add('inactive');
                statusValueEl.classList.add('status-inactive');
            }
        }

        setText('vehicleDetailsDateHired', row.dataset.dateHired);
        setText('vehicleDetailsHiredBy', row.dataset.hiredBy);
        setText('vehicleDetailsFirstName', row.dataset.firstName);
        setText('vehicleDetailsMiddleName', row.dataset.middleName);
        setText('vehicleDetailsLastName', row.dataset.lastName);
        setText('vehicleDetailsBirthdate', row.dataset.birthdate);
        setText('vehicleDetailsNationality', row.dataset.nationality);
        setText('vehicleDetailsHealthCondition', row.dataset.healthCondition);
        setText('vehicleDetailsLastMedical', row.dataset.lastMedical);
        setText('vehicleDetailsPrescriptions', row.dataset.prescriptions || 'N/A');
        setText('vehicleDetailsConditions', row.dataset.conditions || 'N/A');
        setText('vehicleDetailsLicenseNo', row.dataset.licenseNo);
        setText('vehicleDetailsLicenseType', row.dataset.licenseType);
        setText('vehicleDetailsRestriction', row.dataset.restriction || 'None');
        setText('vehicleDetailsDateIssued', row.dataset.dateIssued);
        setText('vehicleDetailsExpiryDate', row.dataset.expiryDate);
        setText('vehicleDetailsAuthorized', row.dataset.authorized);
        setText('vehicleDetailsCompletedTrips', row.dataset.deliveries || '0');
        setText('vehicleDetailsDeclinedAssignments', row.dataset.declined || '0');
        setText('vehicleDetailsAcceptedAssignments', row.dataset.accepted || '0');

        const overspeeding = parseInt(row.dataset.overspeeding, 10) || 0;
        const lateArrival = parseInt(row.dataset.lateArrival, 10) || 0;
        const trafficViolations = parseInt(row.dataset.trafficViolations, 10) || 0;
        const accidents = parseInt(row.dataset.accidents, 10) || 0;
        setText('vehicleDetailsOverspeeding', String(overspeeding));
        setText('vehicleDetailsLateArrival', String(lateArrival));
        setText('vehicleDetailsTrafficViolations', String(trafficViolations));
        setText('vehicleDetailsAccidents', String(accidents));

        const goodRecordBadge = getEl('vehicleDetailsGoodRecordBadge');
        if (goodRecordBadge) {
            goodRecordBadge.style.display =
                overspeeding + lateArrival + trafficViolations + accidents === 0 ? 'flex' : 'none';
        }

        const detailsModal = getEl('vehicleDetailsModal');
        if (detailsModal) {
            detailsModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeVehicleDetails() {
        const detailsModal = getEl('vehicleDetailsModal');
        if (detailsModal) {
            detailsModal.style.display = 'none';
            if (!getEl('editVehicleModal') || !getEl('editVehicleModal').classList.contains('active')) {
                document.body.style.overflow = '';
            }
        }
    }

    function addVehicleRow(id, model, status, condition, lastMaintenance, nextMaintenance) {
        const tbody = getEl('vehiclesTableBody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'vehicle-row';
        row.dataset.vehicleId = id;
        row.dataset.model = model;
        row.dataset.vehicleImage = 'images/truckkkk.jpg';
        row.dataset.driverId = 'DR001';
        row.dataset.contact = '09817289101';
        row.dataset.driverStatus = 'Available';
        row.dataset.contractFrom = '02/30/25';
        row.dataset.contractUntil = '02/30/27';
        row.dataset.dateHired = '01/10/24';
        row.dataset.hiredBy = 'Nolan Smith';
        row.dataset.firstName = 'Juan';
        row.dataset.middleName = 'Santiago';
        row.dataset.lastName = 'Dela Cruz';
        row.dataset.birthdate = '10/20/89';
        row.dataset.nationality = 'Filipino';
        row.dataset.healthCondition = 'Fit to work';
        row.dataset.lastMedical = '04/10/26';
        row.dataset.prescriptions = 'N/A';
        row.dataset.conditions = 'N/A';
        row.dataset.licenseNo = 'NI19-01-92310';
        row.dataset.licenseType = 'Drivers License';
        row.dataset.restriction = 'None';
        row.dataset.dateIssued = '10/29/22';
        row.dataset.expiryDate = '10/29/27';
        row.dataset.authorized = 'LTO Region 10';
        row.dataset.deliveries = '0';
        row.dataset.declined = '0';
        row.dataset.accepted = '0';
        row.dataset.overspeeding = '0';
        row.dataset.lateArrival = '0';
        row.dataset.trafficViolations = '0';
        row.dataset.accidents = '0';

        const selectedStatusClass = statusClass(status);
        const conditionCls = conditionClass(condition, status);

        row.innerHTML =
            '<td class="vehicle-id">' + id + '</td>' +
            '<td class="vehicle-model">' + model + '</td>' +
            '<td><span class="vehicle-status ' + selectedStatusClass + '"><i class="fas fa-circle"></i> ' + status + '</span></td>' +
            '<td class="' + conditionCls + '">' + condition + '</td>' +
            '<td>' + lastMaintenance + '</td>' +
            '<td>' + nextMaintenance + '</td>' +
            '<td class="action-cell"><div class="action-cell-inner">' +
            '<button class="btn-edit" type="button">Edit info</button>' +
            '<button class="btn-danger btn-decommission" type="button">Decommission</button>' +
            '</div></td>';
        tbody.appendChild(row);
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('#vehicleArchivesBtn')) {
            showVehicleArchives();
            return;
        }

        if (e.target.closest('#returnVehiclesBtn')) {
            showVehicleList();
            return;
        }

        if (e.target.closest('#addVehicleBtn')) {
            openVehicleModal(null, true);
            return;
        }

        if (e.target.closest('.btn-restore-vehicle')) {
            const row = e.target.closest('tr');
            if (row && row.dataset.vehicleId) restoreVehicle(row.dataset.vehicleId);
            return;
        }

        if (e.target.closest('.btn-edit') && !e.target.closest('.archived-row')) {
            e.stopPropagation();
            const row = e.target.closest('tr');
            if (row && !e.target.closest('.btn-restore-vehicle')) openVehicleModal(row, false);
            return;
        }

        if (e.target.closest('.btn-decommission')) {
            e.stopPropagation();
            const row = e.target.closest('tr');
            if (row) archiveVehicle(row);
            return;
        }

        if (e.target.closest('#closeVehicleDetailsBtn') || e.target.closest('.vehicle-details-close')) {
            closeVehicleDetails();
            return;
        }

        if (e.target.closest('#closeVehicleModalBtn')) {
            closeVehicleModal();
            return;
        }

        const overlay = getEl('vehicleModalOverlay');
        if (overlay && e.target === overlay) {
            closeVehicleModal();
            return;
        }

        const detailsModal = getEl('vehicleDetailsModal');
        if (detailsModal && e.target === detailsModal) {
            closeVehicleDetails();
            return;
        }

        const row = e.target.closest('.vehicle-row:not(.archived-row)');
        if (!row) return;
        if (e.target.closest('.action-cell')) return;

        document.querySelectorAll('.vehicle-row').forEach(function (r) {
            r.classList.remove('selected');
        });
        row.classList.add('selected');

        if (row.dataset.vehicleId) openVehicleDetails(row.dataset.vehicleId);
    });

    document.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'vehicleArchivesSearch') {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#vehicleArchivesTableBody tr').forEach(function (row) {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        }
    });

    const editVehicleForm = getEl('editVehicleForm');
    if (editVehicleForm) {
        editVehicleForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const editVehicleModel = getEl('editVehicleModel');
            const editVehicleStatus = getEl('editVehicleStatus');
            const editVehicleCondition = getEl('editVehicleCondition');
            const editVehicleMaintenance = getEl('editVehicleMaintenance');
            const modalVehicleModelTitle = getEl('modalVehicleModelTitle');
            const modal = getEl('editVehicleModal');

            const selectedStatus = editVehicleStatus ? editVehicleStatus.value : 'Available';
            const selectedStatusClass = statusClass(selectedStatus);
            const maintenanceValue = editVehicleMaintenance && editVehicleMaintenance.value.trim()
                ? editVehicleMaintenance.value.trim()
                : '--';
            const conditionValue = editVehicleCondition && editVehicleCondition.value.trim()
                ? editVehicleCondition.value.trim()
                : 'Good';
            const modelValue = editVehicleModel && editVehicleModel.value.trim()
                ? editVehicleModel.value.trim()
                : 'Fuso FJ 2828R';
            const conditionCls = conditionClass(conditionValue, selectedStatus);

            if (isAddMode && modal) {
                const newId = modal.dataset.pendingId || ('VCL' + String(nextVehicleNumber++).padStart(3, '0'));
                addVehicleRow(newId, modelValue, selectedStatus, conditionValue, maintenanceValue, '--');
            } else if (activeRow) {
                activeRow.cells[1].textContent = modelValue;
                activeRow.cells[2].innerHTML =
                    '<span class="vehicle-status ' + selectedStatusClass + '"><i class="fas fa-circle"></i> ' + selectedStatus + '</span>';
                activeRow.cells[3].textContent = conditionValue;
                activeRow.cells[3].className = conditionCls;
                activeRow.cells[4].textContent = maintenanceValue;
                activeRow.dataset.model = modelValue;
            }

            if (modalVehicleModelTitle) modalVehicleModelTitle.textContent = modelValue;
            closeVehicleModal();
        });
    }
})();
