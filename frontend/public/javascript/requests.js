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

        // Track current request being viewed
        let currentRequestId = '';

        // Modal Functions
        function openRequestModal(requestId, customerName) {
            currentRequestId = requestId;
            document.getElementById('modalRequestId').textContent = requestId.replace('REQ', 'RQ');
            document.getElementById('modalCustomerName').textContent = customerName;
            document.getElementById('requestDetailsModal').style.display = 'flex';
        }

        function closeRequestModal() {
            document.getElementById('requestDetailsModal').style.display = 'none';
        }

        function approveDelivery() {
            // Add approved log to activity logs
            addApprovedLog(currentRequestId);
            closeRequestModal();
            document.getElementById('approvedModal').style.display = 'flex';
        }

        function addApprovedLog(requestId) {
            const logContainer = document.querySelector('.activity-logs .section-content');
            const newLog = document.createElement('div');
            newLog.className = 'log-entry log-approved';
            newLog.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <div class="log-content">
                    <span class="log-title">${requestId} Approved!</span>
                    <span class="log-time">Just now</span>
                </div>
            `;
            // Insert at the top
            logContainer.insertBefore(newLog, logContainer.firstChild);
        }

        function closeApprovedModal() {
            document.getElementById('approvedModal').style.display = 'none';
        }

        // Create Request Modal Functions
        function openCreateRequestModal() {
            document.getElementById('createRequestModal').style.display = 'flex';
        }

        function closeCreateRequestModal() {
            document.getElementById('createRequestModal').style.display = 'none';
        }

        function togglePassword(btn) {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        }

        function saveToDrafts() {
            alert('Request saved to drafts!');
            closeCreateRequestModal();
        }

        function confirmRequest() {
            alert('Request confirmed successfully!');
            closeCreateRequestModal();
        }

        // Location Modal Functions
        let currentLocationType = '';

        function openLocationModal(type) {
            currentLocationType = type;
            const modal = document.getElementById('locationModal');
            const title = document.getElementById('locationModalTitle');
            const locationTypeSpan = document.getElementById('locationType');
            const confirmTypeSpan = document.getElementById('confirmType');

            if (type === 'pickup') {
                title.textContent = 'Select Pick-Up Location';
                locationTypeSpan.textContent = 'pickup';
                confirmTypeSpan.textContent = 'pick-up';
            } else {
                title.textContent = 'Select Drop-Off Location';
                locationTypeSpan.textContent = 'drop-off';
                confirmTypeSpan.textContent = 'drop-off';
            }

            modal.style.display = 'flex';
        }

        function closeLocationModal() {
            document.getElementById('locationModal').style.display = 'none';
        }

        function confirmLocation() {
            const searchValue = document.getElementById('locationSearch').value;
            if (currentLocationType === 'pickup') {
                document.getElementById('pickupLocation').value = searchValue || 'ZONE 2, Igpit, Opol, 9016 Misamis Oriental';
            } else {
                document.getElementById('dropoffLocation').value = searchValue || 'Malaybalay City, Bukidnon';
            }
            closeLocationModal();
        }

        // Close modals when clicking outside
        window.onclick = function(event) {
            const requestModal = document.getElementById('requestDetailsModal');
            const approvedModal = document.getElementById('approvedModal');
            const createModal = document.getElementById('createRequestModal');
            const locationModal = document.getElementById('locationModal');
            if (event.target === requestModal) {
                closeRequestModal();
            }
            if (event.target === approvedModal) {
                closeApprovedModal();
            }
            if (event.target === createModal) {
                closeCreateRequestModal();
            }
            if (event.target === locationModal) {
                closeLocationModal();
            }
        }