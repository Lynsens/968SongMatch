// JavaScript for Recognition History Page

// Global state
let historyData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeHistoryPage();
});

// Page initialization
function initializeHistoryPage() {
    loadHistory();
}

// Load recognition history
async function loadHistory() {
    try {
        showHistoryLoading();
        
        // For now, we'll simulate history data since we need to implement proper storage
        // In a real implementation, this would fetch from an API endpoint
        historyData = getSimulatedHistory();
        
        if (historyData.length === 0) {
            showNoHistory();
        } else {
            filteredData = [...historyData];
            displayHistory();
            updateHistoryStats();
        }
        
    } catch (error) {
        console.error('History loading error:', error);
        DejavuApp.showAlert(`Failed to load history: ${error.message}`, 'danger');
        showNoHistory();
    }
}

// Get simulated history data (replace with actual API call)
function getSimulatedHistory() {
    const now = new Date();
    return [
        {
            id: 1,
            timestamp: new Date(now - 300000).toISOString(), // 5 min ago
            source: 'test_audio.mp3',
            source_type: 'file',
            matched: true,
            song_name: '安静 - Jay Chou',
            confidence: 0.95,
            offset_seconds: 15.2,
            processing_time: 1.8
        },
        {
            id: 2,
            timestamp: new Date(now - 600000).toISOString(), // 10 min ago
            source: 'unknown_song.wav',
            source_type: 'file',
            matched: false,
            song_name: null,
            confidence: 0,
            processing_time: 2.1
        },
        {
            id: 3,
            timestamp: new Date(now - 900000).toISOString(), // 15 min ago
            source: 'microphone',
            source_type: 'microphone',
            matched: true,
            song_name: '爱在西元前 - Jay Chou',
            confidence: 0.87,
            offset_seconds: 42.6,
            processing_time: 2.5
        },
        {
            id: 4,
            timestamp: new Date(now - 1800000).toISOString(), // 30 min ago
            source: 'slice_test.mp3',
            source_type: 'file',
            matched: true,
            song_name: 'Mine Mine - Jay Chou',
            confidence: 0.92,
            offset_seconds: 8.1,
            processing_time: 1.6,
            timed_out: false
        },
        {
            id: 5,
            timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
            source: 'noisy_audio.mp3',
            source_type: 'file',
            matched: false,
            song_name: null,
            confidence: 0,
            processing_time: 3.0,
            timed_out: true
        }
    ];
}

// Show loading state
function showHistoryLoading() {
    document.getElementById('historyLoading').style.display = 'block';
    document.getElementById('noHistory').style.display = 'none';
    document.getElementById('historyTable').style.display = 'none';
}

// Show no history message
function showNoHistory() {
    document.getElementById('historyLoading').style.display = 'none';
    document.getElementById('noHistory').style.display = 'block';
    document.getElementById('historyTable').style.display = 'none';
    
    // Clear stats
    updateHistoryStats([]);
}

// Display history data
function displayHistory() {
    document.getElementById('historyLoading').style.display = 'none';
    document.getElementById('noHistory').style.display = 'none';
    document.getElementById('historyTable').style.display = 'block';
    
    renderHistoryTable();
    renderPagination();
}

// Render history table
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);
    
    let tableHTML = '';
    
    pageData.forEach(item => {
        const statusBadge = getStatusBadge(item);
        const sourceIcon = item.source_type === 'microphone' ? 'fa-microphone' : 'fa-file-audio';
        
        tableHTML += `
            <tr>
                <td>
                    <small>${DejavuApp.formatTimestamp(item.timestamp)}</small>
                </td>
                <td>
                    <i class="fas ${sourceIcon} me-2 text-muted"></i>
                    ${item.source}
                </td>
                <td>
                    ${statusBadge}
                    ${item.matched ? `<div class="small text-muted mt-1">${item.song_name}</div>` : ''}
                </td>
                <td>
                    ${item.matched ? DejavuApp.formatConfidence(item.confidence) : 'N/A'}
                </td>
                <td>
                    ${DejavuApp.formatTime(item.processing_time)}
                    ${item.timed_out ? '<i class="fas fa-clock text-warning ms-1" title="Timed out"></i>' : ''}
                </td>
                <td>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="showResultDetails(${item.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    if (tableHTML === '') {
        tableHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-search-minus fa-2x mb-2"></i>
                    <div>No results match your current filters</div>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = tableHTML;
}

// Get status badge for history item
function getStatusBadge(item) {
    if (item.timed_out) {
        return '<span class="badge badge-timeout">Timeout</span>';
    } else if (item.matched) {
        return '<span class="badge badge-match">Match</span>';
    } else {
        return '<span class="badge badge-no-match">No Match</span>';
    }
}

// Render pagination
function renderPagination() {
    const pagination = document.getElementById('historyPagination');
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
            </li>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${i})">${i}</a></li>`;
        } else if (Math.abs(i - currentPage) === 3) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
            </li>
        `;
    }
    
    pagination.querySelector('.pagination').innerHTML = paginationHTML;
    pagination.style.display = 'block';
}

// Change page
function changePage(page) {
    currentPage = page;
    renderHistoryTable();
    renderPagination();
}

// Filter history
function filterHistory() {
    const searchQuery = document.getElementById('searchQuery').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredData = historyData.filter(item => {
        // Search filter
        if (searchQuery && !item.source.toLowerCase().includes(searchQuery) && 
            (!item.song_name || !item.song_name.toLowerCase().includes(searchQuery))) {
            return false;
        }
        
        // Status filter
        if (statusFilter) {
            if (statusFilter === 'match' && !item.matched) return false;
            if (statusFilter === 'no_match' && item.matched) return false;
            if (statusFilter === 'timeout' && !item.timed_out) return false;
        }
        
        // Date filter
        if (dateFilter) {
            const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
            if (itemDate !== dateFilter) return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    displayHistory();
    updateHistoryStats();
}

// Update history statistics
function updateHistoryStats(data = filteredData) {
    const totalTests = data.length;
    const totalMatches = data.filter(item => item.matched).length;
    const totalNoMatches = data.filter(item => !item.matched && !item.timed_out).length;
    const successRate = totalTests > 0 ? ((totalMatches / totalTests) * 100).toFixed(1) : 0;
    
    document.getElementById('totalTests').textContent = totalTests;
    document.getElementById('totalMatches').textContent = totalMatches;
    document.getElementById('totalNoMatches').textContent = totalNoMatches;
    document.getElementById('successRate').textContent = `${successRate}%`;
}

// Show result details modal
function showResultDetails(itemId) {
    const item = historyData.find(h => h.id === itemId);
    if (!item) return;
    
    const modalContent = document.getElementById('resultDetailsContent');
    
    let detailsHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h6><i class="fas fa-clock me-2"></i>Timestamp</h6>
                <p>${DejavuApp.formatTimestamp(item.timestamp)}</p>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-${item.source_type === 'microphone' ? 'microphone' : 'file-audio'} me-2"></i>Source</h6>
                <p>${item.source} <span class="badge bg-secondary">${item.source_type}</span></p>
            </div>
        </div>
        
        <div class="row mb-3">
            <div class="col-md-12">
                <h6><i class="fas fa-search-plus me-2"></i>Recognition Result</h6>
                ${item.matched ? `
                    <div class="alert alert-success">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-check-circle fa-2x me-3"></i>
                            <div>
                                <h5 class="mb-1">Match Found</h5>
                                <p class="mb-0">${item.song_name}</p>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="alert alert-${item.timed_out ? 'warning' : 'danger'}">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-${item.timed_out ? 'clock' : 'times-circle'} fa-2x me-3"></i>
                            <div>
                                <h5 class="mb-1">${item.timed_out ? 'Recognition Timed Out' : 'No Match Found'}</h5>
                                <p class="mb-0">${item.timed_out ? 'Processing took too long' : 'Song not found in database'}</p>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-4">
                <h6><i class="fas fa-percentage me-2"></i>Confidence</h6>
                <p>${DejavuApp.formatConfidence(item.confidence)}</p>
            </div>
            <div class="col-md-4">
                <h6><i class="fas fa-stopwatch me-2"></i>Processing Time</h6>
                <p>${DejavuApp.formatTime(item.processing_time)}</p>
            </div>
            ${item.offset_seconds !== undefined ? `
                <div class="col-md-4">
                    <h6><i class="fas fa-play me-2"></i>Offset</h6>
                    <p>${DejavuApp.formatTime(item.offset_seconds)}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    modalContent.innerHTML = detailsHTML;
    DejavuApp.showModal('resultDetailsModal');
}

// Refresh history
async function refreshHistory() {
    await loadHistory();
    DejavuApp.showAlert('History refreshed', 'success', 2000);
}

// Clear history
async function clearHistory() {
    if (!confirm('Are you sure you want to clear all recognition history? This action cannot be undone.')) {
        return;
    }
    
    try {
        // In a real implementation, this would call an API to clear history
        historyData = [];
        filteredData = [];
        
        showNoHistory();
        DejavuApp.showAlert('History cleared', 'success');
        
    } catch (error) {
        DejavuApp.showAlert(`Failed to clear history: ${error.message}`, 'danger');
    }
}