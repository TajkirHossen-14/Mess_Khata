import React from 'react';

const StatusPill = ({ status, children }) => {
  let style = 'bg-ice100 text-secondaryText'; // neutral

  if (status === 'success') {
    style = 'bg-statusSuccess/10 text-statusSuccess';
  } else if (status === 'pending') {
    style = 'bg-statusPending/10 text-statusPending';
  } else if (status === 'error') {
    style = 'bg-statusError/10 text-statusError';
  } else if (status === 'info') {
    style = 'bg-blue400/10 text-blue700';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {children}
    </span>
  );
};

export default StatusPill;

