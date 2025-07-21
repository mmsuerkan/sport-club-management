import React from 'react'

const StatCard = ({ icon, label, labelTextColor, value, subLabel, subLabelTextColor, gradientFrom, gradientTo, borderColor, iconBgColor, textColor, iconSize }: {
    icon?: React.ReactElement<{ className?: string }>;
    label?: string;
    labelTextColor?: string;
    value: number | string;
    subLabel?: string;
    subLabelTextColor: string;
    gradientFrom: string;
    gradientTo: string;
    borderColor: string;
    iconBgColor?: string;
    textColor: string;
    iconSize?: "small" | "medium";
}) => {
    return (
        <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl p-6 border ${borderColor}`}>
            {label ? 
            <div className="flex items-center justify-between mb-4">
                <div className={`${iconSize === "medium" ? "w-12 h-12" : "p-3"} ${iconBgColor} rounded-lg flex items-center justify-center`}>
                    {React.isValidElement(icon)
                        ? React.cloneElement(icon, { className: "h-6 w-6 text-white" })
                        : icon}
                </div>
                <span className={`text-sm font-medium ${labelTextColor}`}>{label}</span>
            </div>
            : ''}
            <h3 className={`text-3xl font-bold mb-1 ${textColor}`}>{value}</h3>
            {subLabel && <p className={`text-sm ${subLabelTextColor}`}>{subLabel}</p>}
        </div>
    )
}

export default StatCard