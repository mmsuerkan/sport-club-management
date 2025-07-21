import React from 'react'

const Loading = ({message}: {message: string}) => {
    return (
        <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            <p className="ml-2 text-gray-600">{message}</p>
        </div>
    )
}

export default Loading