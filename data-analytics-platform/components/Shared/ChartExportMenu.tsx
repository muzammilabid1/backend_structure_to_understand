import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Download, Copy, Check, Image } from 'lucide-react'
import html2canvas from 'html2canvas'
import styles from './ChartExportMenu.module.scss'

interface ChartExportMenuProps {
  data: any
  filename: string
  chartRef?: React.RefObject<HTMLDivElement>
  onCopy?: () => void
  onDownload?: () => void
  onImageDownload?: () => void
}

export default function ChartExportMenu({ data, filename, chartRef, onCopy, onDownload, onImageDownload }: ChartExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<'copy' | 'download' | 'image' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Clear feedback after delay
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [actionFeedback])

  const handleCopyData = async () => {
    try {
      const csvData = convertToCSV(data)
      await navigator.clipboard.writeText(csvData)
      setActionFeedback('copy')
      onCopy?.()
    } catch (error) {
      console.error('Failed to copy data:', error)
    }
    setIsOpen(false)
  }

  const handleDownloadCSV = () => {
    try {
      const csvData = convertToCSV(data)
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      
      setActionFeedback('download')
      onDownload?.()
    } catch (error) {
      console.error('Failed to download data:', error)
    }
    setIsOpen(false)
  }

  const handleDownloadImage = async () => {
    if (!chartRef?.current) {
      console.error('Chart reference not available for image capture')
      return
    }

    try {
      // Find the chart container within the ref
      const chartContainer = chartRef.current.querySelector('div[style*="height"]') as HTMLElement
      
      if (!chartContainer) {
        console.error('Chart container not found')
        return
      }

      const canvas = await html2canvas(chartContainer, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: chartContainer.offsetWidth,
        height: chartContainer.offsetHeight
      })

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${filename}.png`
          link.style.visibility = 'hidden'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      }, 'image/png', 1.0)

      setActionFeedback('image')
      onImageDownload?.()
    } catch (error) {
      console.error('Failed to capture chart image:', error)
    }
    setIsOpen(false)
  }

  const convertToCSV = (data: any): string => {
    if (!data) return ''

    // Handle different data structures
    if (Array.isArray(data)) {
      // Simple array of objects
      if (data.length === 0) return ''
      
      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(value).replace(/"/g, '""')
            return escaped.includes(',') ? `"${escaped}"` : escaped
          }).join(',')
        )
      ]
      return csvRows.join('\n')
    }

    // Handle nested data structures (like chart data with all_students/pupil_premium)
    if (typeof data === 'object' && data !== null) {
      const flatData: any[] = []
      
      Object.keys(data).forEach(category => {
        if (Array.isArray(data[category])) {
          data[category].forEach((item: any) => {
            flatData.push({
              category,
              ...item
            })
          })
        }
      })
      
      if (flatData.length === 0) return ''
      
      const headers = Object.keys(flatData[0])
      const csvRows = [
        headers.join(','),
        ...flatData.map(row => 
          headers.map(header => {
            const value = row[header]
            const escaped = String(value).replace(/"/g, '""')
            return escaped.includes(',') ? `"${escaped}"` : escaped
          }).join(',')
        )
      ]
      return csvRows.join('\n')
    }

    return ''
  }

  return (
    <div className={styles.exportMenu} ref={menuRef}>
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Export chart data"
        type="button"
      >
        <MoreVertical size={16} />
      </button>
      
      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={styles.menuItem}
            onClick={handleCopyData}
            type="button"
          >
            {actionFeedback === 'copy' ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Data</span>
              </>
            )}
          </button>
          
          <button
            className={styles.menuItem}
            onClick={handleDownloadCSV}
            type="button"
          >
            {actionFeedback === 'download' ? (
              <>
                <Check size={14} />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Download CSV</span>
              </>
            )}
          </button>
          
          <button
            className={styles.menuItem}
            onClick={handleDownloadImage}
            type="button"
            disabled={!chartRef}
          >
            {actionFeedback === 'image' ? (
              <>
                <Check size={14} />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Image size={14} />
                <span>Download Image</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
} 