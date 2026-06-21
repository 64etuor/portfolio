'use client'

// Thin client wrapper so the heavy Spline runtime can be code-split into its own
// lazy chunk via next/dynamic. Importing '@splinetool/react-spline' directly in a
// dynamic() call fails module resolution (the package's exports field has no
// require/default condition); re-exporting it from a local module that next can
// resolve sidesteps that while keeping the 568KB runtime off the initial bundle.
export { default } from '@splinetool/react-spline'
