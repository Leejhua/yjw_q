import React from 'react'

const TabPane = (props) => {
  const { children, tab, key } = props
  
  // 这个是一个简化的TabPane组件，实际应用中会有更多功能
  return (
    <div key={key}>
      {children}
    </div>
  )
}

export default TabPane