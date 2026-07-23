const ANSSI_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function validatePasswordStrength(password) {
    if (!ANSSI_PASSWORD_REGEX.test(password)) {
        return {
            valid: false,
            error: "Le mot de passe doit contenir au moins 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial."
        };
    }
    return { valid: true };
}

module.exports = { validatePasswordStrength, ANSSI_PASSWORD_REGEX };
