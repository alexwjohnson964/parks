
module.exports = function validateUserInput(content, type, maxLength = 30, minLength= 1) {
  return content
  .trim()
  .isLength({ min: minLength })
  .withMessage(`${type} is required.`)
  .bail()
  .isLength({ max: maxLength })
  .withMessage(`${type} is too long. Maximum length is 30 characters.`)
  .isAlpha('en-US', {ignore: [' ', ',', ';', '.', '!']})
  .withMessage(`${type} contains invalid characters. The text must contain only alphabetic characters and punctuation.`);
}