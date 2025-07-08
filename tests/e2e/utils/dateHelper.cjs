/**
 * Helper functions for date formatting in JST
 */

/**
 * Convert date to JST timestamp string
 * @param {Date} date - Date object (default: current date)
 * @returns {string} JST timestamp in format "YYYY-MM-DD_HH-mm-ss-JST"
 */
function toJSTString(date = new Date()) {
    // JST is UTC+9
    const jstOffset = 9 * 60; // 9 hours in minutes
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const jstTime = new Date(utcTime + (jstOffset * 60000));
    
    const year = jstTime.getFullYear();
    const month = String(jstTime.getMonth() + 1).padStart(2, '0');
    const day = String(jstTime.getDate()).padStart(2, '0');
    const hours = String(jstTime.getHours()).padStart(2, '0');
    const minutes = String(jstTime.getMinutes()).padStart(2, '0');
    const seconds = String(jstTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-JST`;
}

/**
 * Get JST formatted timestamp for logs
 * @returns {string} JST timestamp in format "HH:mm:ss"
 */
function getJSTLogTime() {
    const date = new Date();
    const jstOffset = 9 * 60;
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const jstTime = new Date(utcTime + (jstOffset * 60000));
    
    const hours = String(jstTime.getHours()).padStart(2, '0');
    const minutes = String(jstTime.getMinutes()).padStart(2, '0');
    const seconds = String(jstTime.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

module.exports = {
    toJSTString,
    getJSTLogTime
};