let currentDeliveryId = '';

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

        // Delivery timeline data for each delivery
        const deliveryTimelines = {
            'DLV0001': [
                { step: 'Dispatched', time: '12:30 pm', state: 'completed' },
                { step: 'In Transit', time: '1:30 pm', state: 'active', tag: 'On time' },
                { step: 'Arrived at Pickup', time: '', state: 'pending' },
                { step: 'Out for Delivery', time: '', state: 'pending' },
                { step: 'Arrived at Drop-off', time: '', state: 'pending' },
                { step: 'Returning to HQ', time: '', state: 'pending' },
                { step: 'Completed', time: '', state: 'pending' }
            ],
            'DLV0002': [
                { step: 'Dispatched', time: '10:00 am', state: 'completed' },
                { step: 'In Transit', time: '11:15 am', state: 'active', tag: 'On time' },
                { step: 'Arrived at Pickup', time: '', state: 'pending' },
                { step: 'Out for Delivery', time: '', state: 'pending' },
                { step: 'Arrived at Drop-off', time: '', state: 'pending' },
                { step: 'Returning to HQ', time: '', state: 'pending' },
                { step: 'Completed', time: '', state: 'pending' }
            ],
            'DLV0003': [
                { step: 'Dispatched', time: '8:00 am', state: 'completed' },
                { step: 'In Transit', time: '9:30 am', state: 'active', tag: 'On time' },
                { step: 'Arrived at Pickup', time: '', state: 'pending' },
                { step: 'Out for Delivery', time: '', state: 'pending' },
                { step: 'Arrived at Drop-off', time: '', state: 'pending' },
                { step: 'Returning to HQ', time: '', state: 'pending' },
                { step: 'Completed', time: '', state: 'pending' }
            ],
            'DLV0004': [
                { step: 'Dispatched', time: '7:00 am', state: 'completed' },
                { step: 'In Transit', time: '8:30 am', state: 'completed' },
                { step: 'Arrived at Pickup', time: '10:00 am', state: 'completed' },
                { step: 'Out for Delivery', time: '11:30 am', state: 'completed' },
                { step: 'Arrived at Drop-off', time: '1:00 pm', state: 'completed' },
                { step: 'Returning to HQ', time: '3:00 pm', state: 'active', tag: 'On time' },
                { step: 'Completed', time: '', state: 'pending' }
            ],
            'DLV0005': [
                { step: 'Dispatched', time: '6:00 am', state: 'completed' },
                { step: 'In Transit', time: '7:30 am', state: 'completed' },
                { step: 'Arrived at Pickup', time: '9:00 am', state: 'completed' },
                { step: 'Out for Delivery', time: '10:30 am', state: 'completed' },
                { step: 'Arrived at Drop-off', time: '12:00 pm', state: 'completed' },
                { step: 'Returning to HQ', time: '2:00 pm', state: 'completed' },
                { step: 'Completed', time: '4:00 pm', state: 'active', tag: 'Done' }
            ],
            'DLV0023': [
                { step: 'Dispatched', time: '5:00 am', state: 'completed' },
                { step: 'In Transit', time: '6:30 am', state: 'completed' },
                { step: 'Arrived at Pickup', time: '8:00 am', state: 'completed' },
                { step: 'Out for Delivery', time: '9:30 am', state: 'completed' },
                { step: 'Arrived at Drop-off', time: '11:00 am', state: 'completed' },
                { step: 'Returning to HQ', time: '1:00 pm', state: 'completed' },
                { step: 'Completed', time: '3:00 pm', state: 'active', tag: 'Done' }
            ],
            'DLV0030': [
                { step: 'Dispatched', time: '4:00 am', state: 'completed' },
                { step: 'In Transit', time: '5:30 am', state: 'completed' },
                { step: 'Arrived at Pickup', time: '7:00 am', state: 'completed' },
                { step: 'Out for Delivery', time: '8:30 am', state: 'completed' },
                { step: 'Arrived at Drop-off', time: '10:00 am', state: 'completed' },
                { step: 'Returning to HQ', time: '12:00 pm', state: 'completed' },
                { step: 'Completed', time: '2:00 pm', state: 'active', tag: 'Done' }
            ],
            'DLV0019': [
                { step: 'Dispatched', time: '8:00 am', state: 'completed' },
                { step: 'In Transit', time: '9:30 am', state: 'completed' },
                { step: 'Arrived at Pickup', time: '11:00 am', state: 'completed' },
                { step: 'Out for Delivery', time: '1:00 pm', state: 'completed' },
                { step: 'Arrived at Drop-off', time: '3:00 pm', state: 'completed' },
                { step: 'Returning to HQ', time: '5:00 pm', state: 'completed' },
                { step: 'Completed', time: '7:00 pm', state: 'active', tag: 'Done' }
            ],
            'DLV0035': [
                { step: 'Dispatched', time: '7:00 am', state: 'completed' },
                { step: 'In Transit', time: '8:30 am', state: 'completed' },
                { step: 'Arrived at Pickup', time: '10:00 am', state: 'completed' },
                { step: 'Out for Delivery', time: '11:30 am', state: 'completed' },
                { step: 'Arrived at Drop-off', time: '1:00 pm', state: 'completed' },
                { step: 'Returning to HQ', time: '3:00 pm', state: 'completed' },
                { step: 'Completed', time: '5:00 pm', state: 'active', tag: 'Done' }
            ]
        };

        function openDeliveryPanel(deliveryId) {
            currentDeliveryId = deliveryId;
            const row = document.querySelector('tr[data-delivery-id="' + deliveryId + '"]');
            if (!row) return;

            document.getElementById('panelDeliveryId').textContent = deliveryId;
            document.getElementById('panelCustomerName').textContent = row.dataset.customer;
            document.getElementById('panelDistance').textContent = 'Distance: ' + row.dataset.distance;
            document.getElementById('panelContact').textContent = row.dataset.contact;
            document.getElementById('panelDriver').textContent = row.dataset.driver + ' (' + row.dataset.driverId + ')';
            document.getElementById('panelVehicle').textContent = row.dataset.vehicle;
            document.getElementById('panelPickup').textContent = row.dataset.pickup;
            document.getElementById('panelDropoff').textContent = row.dataset.dropoff;

            const statusBadge = document.getElementById('panelStatusBadge');
            statusBadge.textContent = row.dataset.status;
            statusBadge.className = 'panel-status-badge';
            if (row.dataset.statusType === 'in-transit') {
                statusBadge.classList.add('in-transit');
            } else if (row.dataset.statusType === 'returning') {
                statusBadge.classList.add('returning');
            } else if (row.dataset.statusType === 'completed') {
                statusBadge.classList.add('completed');
            }

            const timeline = deliveryTimelines[deliveryId];
            const timelineContainer = document.getElementById('panelTimeline');
            timelineContainer.innerHTML = '';
            if (timeline) {
                timeline.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'timeline-item ' + item.state;
                    if (item.state === 'completed') {
                        itemDiv.innerHTML = `
                            <div class="timeline-marker"><i class="fas fa-check"></i></div>
                            <div class="timeline-text">${item.step}</div>
                            <div class="timeline-time">${item.time}</div>
                        `;
                    } else if (item.state === 'active') {
                        itemDiv.innerHTML = `
                            <div class="timeline-marker"></div>
                            <div class="timeline-text">${item.step}</div>
                            <div class="timeline-meta">
                                ${item.tag ? '<span class="timeline-tag">' + item.tag + '</span>' : ''}
                                <span class="timeline-time">${item.time}</span>
                            </div>
                        `;
                    } else {
                        itemDiv.innerHTML = `
                            <div class="timeline-marker"></div>
                            <div class="timeline-text">${item.step}</div>
                            <div class="timeline-time">${item.time}</div>
                        `;
                    }
                    timelineContainer.appendChild(itemDiv);
                });

                const activeItem = timeline.find(t => t.state === 'active');
                if (activeItem && activeItem.time) {
                    document.getElementById('panelLastUpdated').textContent = activeItem.time;
                } else {
                    document.getElementById('panelLastUpdated').textContent = '—';
                }
            }

            document.getElementById('deliveryPanel').classList.add('active');
            document.getElementById('panelOverlay').classList.add('active');
            document.body.classList.add('panel-open');
        }

        function closeDeliveryPanel() {
            document.getElementById('deliveryPanel').classList.remove('active');
            document.getElementById('panelOverlay').classList.remove('active');
            document.body.classList.remove('panel-open');
        }

        function changePage(direction) {
            const pageNumberEl = document.querySelector('.delivery-pagination .page-number');
            let currentPage = parseInt(pageNumberEl.textContent);
            currentPage += direction;
            if (currentPage < 1) currentPage = 1;
            pageNumberEl.textContent = currentPage;
        }

        function openMapModal() {
            if (!currentDeliveryId) return;
            const row = document.querySelector('tr[data-delivery-id="' + currentDeliveryId + '"]');
            if (!row) return;

            document.getElementById('mapHeaderId').textContent = currentDeliveryId;
            document.getElementById('mapHeaderName').textContent = row.dataset.customer;
            document.getElementById('mapVehicle').textContent = row.dataset.vehicle;
            document.getElementById('mapDistance').textContent = row.dataset.distance;
            document.getElementById('mapPickup').textContent = row.dataset.pickup;
            document.getElementById('mapDropoff').textContent = row.dataset.dropoff;
            document.getElementById('mapDriverName').textContent = row.dataset.driver;
            document.getElementById('mapDriverContact').textContent = 'Contact Number: ' + row.dataset.contact;

            const statusBadge = document.getElementById('mapStatusBadge');
            statusBadge.textContent = row.dataset.status;
            statusBadge.className = 'map-status-badge';
            if (row.dataset.statusType === 'in-transit') {
                statusBadge.classList.add('in-transit');
            } else if (row.dataset.statusType === 'returning') {
                statusBadge.classList.add('returning');
            } else if (row.dataset.statusType === 'completed') {
                statusBadge.classList.add('completed');
            }

            const etaMap = {
                'DLV0001': '2hrs and 30mins',
                'DLV0002': '3hrs and 15mins',
                'DLV0003': '6hrs and 45mins',
                'DLV0004': '1hr and 20mins',
                'DLV0005': 'Delivered',
                'DLV0023': 'Delivered',
                'DLV0030': 'Delivered',
                'DLV0019': 'Delivered',
                'DLV0035': 'Delivered'
            };
            document.getElementById('mapEta').textContent = etaMap[currentDeliveryId] || '—';

            const lastSeenMap = {
                'John Jones': 'Puerto, Bukidnon – 4:35 PM',
                'Juan D.': 'Ozamiz City – 3:15 PM',
                'James A.': 'Davao City – 2:50 PM',
                'Alec J.': 'Zamboanga City – 5:10 PM',
                'Tom V.': 'Valencia City – 1:45 PM'
            };
            document.getElementById('mapDriverLastSeen').textContent = 'Last seen: ' + (lastSeenMap[row.dataset.driver] || '—');

            document.getElementById('mapModal').classList.add('active');
            document.getElementById('mapModalOverlay').classList.add('active');
            document.body.classList.add('map-open');
        }

        function closeMapModal() {
            document.getElementById('mapModal').classList.remove('active');
            document.getElementById('mapModalOverlay').classList.remove('active');
            document.body.classList.remove('map-open');
        }