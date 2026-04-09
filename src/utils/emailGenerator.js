/**
 * @description Generate an internal email for students with a random suffix
 * @param {string} studentCode 
 * @param {string} schoolId (Unused now but kept for signature consistency if needed elsewhere)
 * @returns {string}
 */
const generateInternalEmail = (studentCode, schoolId) => {
    // Generate a random 4-character alphanumeric suffix
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `s${studentCode}@ik.${randomSuffix}.co`.toLowerCase();
};

module.exports = {
    generateInternalEmail
};
