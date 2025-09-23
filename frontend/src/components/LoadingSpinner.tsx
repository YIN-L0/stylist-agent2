import React from 'react'

const LoadingSpinner: React.FC = () => {
  return (
    <div className="inline-flex items-center justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
    </div>
  )
}

export default LoadingSpinner
