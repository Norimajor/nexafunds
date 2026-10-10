export const getDownloadFilename = (contentDisposition) => {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName)
    } catch {
      return 'NexaFunds-EA.ex5'
    }
  }
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] || 'NexaFunds-EA.ex5'
}
