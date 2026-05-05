import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: '#112233',
        paddingBottom: 20,
    },
    companyLeft: {
        width: '60%',
    },
    logo: {
        width: 80,
        height: 40,
        objectFit: 'contain',
        marginBottom: 6,
    },
    docInfoRight: {
        width: '35%',
        textAlign: 'right',
    },
    companyName: {
        fontSize: 20,
        fontWeight: 'extrabold',
        color: '#112233',
        marginBottom: 4,
    },
    companyDetailLine: {
        fontSize: 9,
        color: '#555',
        marginBottom: 2,
    },
    docTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#112233',
        marginBottom: 10,
        letterSpacing: 2,
    },
    docInfoGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    docInfoRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    docInfoLabel: {
        fontWeight: 'bold',
        color: '#666',
        marginRight: 10,
        width: 60,
    },
    docInfoValue: {
        width: 80,
    },
    clientSection: {
        flexDirection: 'row',
        marginBottom: 30,
        backgroundColor: '#f8fafc',
        padding: 15,
        borderRadius: 4,
    },
    clientBlock: {
        width: '50%',
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    clientName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    table: {
        display: "flex",
        width: "auto",
        marginBottom: 30,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: '#112233',
        color: '#ffffff',
        paddingVertical: 8,
        paddingHorizontal: 4,
        fontWeight: 'bold',
        fontSize: 9,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    colNo: { width: "8%" },
    colDesc: { width: "47%" },
    colQty: { width: "10%", textAlign: 'center' },
    colPrice: { width: "15%", textAlign: 'right' },
    colTotal: { width: "20%", textAlign: 'right' },
    totalsArea: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 40,
    },
    totalsBox: {
        width: '40%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    totalRowFinal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderTopWidth: 2,
        borderTopColor: '#112233',
        marginTop: 4,
    },
    totalLabel: {
        fontWeight: 'bold',
        color: '#64748b',
    },
    totalValue: {
        fontWeight: 'bold',
    },
    totalValueFinal: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#112233',
    },
    footerContainer: {
        marginTop: 'auto',
    },
    notesBox: {
        marginBottom: 20,
        backgroundColor: '#fffbf0',
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
        borderLeftStyle: 'solid',
        padding: 14,
        borderRadius: 4,
    },
    notesTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#92400e',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    notesLine: {
        fontSize: 9,
        color: '#555',
        lineHeight: 1.6,
        marginBottom: 3,
    },
    bankBox: {
        marginBottom: 20,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 4,
    },
    bankTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    bankLine: {
        fontSize: 9,
        color: '#475569',
        marginBottom: 2,
    },
    signaturesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    signatureBlock: {
        width: '40%',
    },
    signatureLine: {
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        marginBottom: 8,
    },
    signatureLabel: {
        fontSize: 9,
        color: '#64748b',
        textAlign: 'center',
    },
    receiptHeader: {
        textAlign: 'center',
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: '#112233',
        paddingBottom: 20,
    },
    receiptTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#112233',
        letterSpacing: 3,
        marginBottom: 8,
    },
    receiptDetail: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    receiptLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#64748b',
    },
    receiptValue: {
        fontSize: 11,
        color: '#0f172a',
    },
    receiptAmountBox: {
        backgroundColor: '#112233',
        padding: 20,
        borderRadius: 4,
        marginTop: 30,
        alignItems: 'center',
    },
    receiptAmountLabel: {
        fontSize: 10,
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    receiptAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});

interface CompanyDetails {
    companyName: string;
    address: string;
    contactNo: string;
    email: string;
    website?: string | null;
    brn?: string | null;
    sstNumber?: string | null;
    enableSst?: boolean;
    bankName?: string | null;
    bankAccount?: string | null;
    bankSwift?: string | null;
    logoUrl?: string | null;
}

interface PdfProps {
    type: 'Quotation' | 'Invoice' | 'Receipt';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    companyDetails?: CompanyDetails;
}

const formatMoney = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PdfDocument = ({ type, data, companyDetails }: PdfProps) => {
    if (type === 'Receipt') {
        return (
            <Document>
                <Page size="A4" style={styles.page}>
                    <View style={{ textAlign: 'center', marginBottom: 20 }}>
                        {companyDetails?.logoUrl && (
                            <Image style={{ width: 80, height: 40, objectFit: 'contain', marginBottom: 6, alignSelf: 'center' }} src={companyDetails.logoUrl} />
                        )}
                        <Text style={styles.companyName}>{companyDetails?.companyName || 'SwiftApp Ecosystem'}</Text>
                        <Text style={styles.companyDetailLine}>{companyDetails?.address || ''}</Text>
                        <Text style={styles.companyDetailLine}>Tel: {companyDetails?.contactNo || ''} | Email: {companyDetails?.email || ''}</Text>
                    </View>

                    <View style={styles.receiptHeader}>
                        <Text style={styles.receiptTitle}>RECEIPT</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>Payment Acknowledgement</Text>
                    </View>

                    <View style={{ marginBottom: 30 }}>
                        <View style={styles.receiptDetail}>
                            <Text style={styles.receiptLabel}>Receipt No.</Text>
                            <Text style={styles.receiptValue}>{String(data.receiptNumber || '')}</Text>
                        </View>
                        <View style={styles.receiptDetail}>
                            <Text style={styles.receiptLabel}>Invoice Ref.</Text>
                            <Text style={styles.receiptValue}>{String(data.invoiceNumber || '')}</Text>
                        </View>
                        <View style={styles.receiptDetail}>
                            <Text style={styles.receiptLabel}>Payment Method</Text>
                            <Text style={styles.receiptValue}>{String(data.paymentMethod || 'N/A')}</Text>
                        </View>
                        <View style={styles.receiptDetail}>
                            <Text style={styles.receiptLabel}>Payment Date</Text>
                            <Text style={styles.receiptValue}>{String(data.paymentDate || '')}</Text>
                        </View>
                        <View style={styles.receiptDetail}>
                            <Text style={styles.receiptLabel}>Project</Text>
                            <Text style={styles.receiptValue}>{String(data.projectName || '')}</Text>
                        </View>
                    </View>

                    <View style={styles.receiptAmountBox}>
                        <Text style={styles.receiptAmountLabel}>Amount Paid</Text>
                        <Text style={styles.receiptAmount}>RM {formatMoney(Number(data.amountPaid || 0))}</Text>
                    </View>

                    <View style={styles.footerContainer}>
                        <Text style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>
                            This is a computer-generated receipt. No signature is required.
                        </Text>
                    </View>
                </Page>
            </Document>
        );
    }

    const items = (data.items as { description: string; quantity: number; unitPrice: number }[]) || [];
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const hasSST = !!companyDetails?.enableSst;
    const sstRate = 0.08;
    const sstAmount = hasSST ? subtotal * sstRate : 0;
    const grandTotal = hasSST ? subtotal + sstAmount : subtotal;

    const showBankDetails = (type === 'Invoice' || type === 'Quotation') && (companyDetails?.bankName || companyDetails?.bankAccount);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.companyLeft}>
                        {companyDetails?.logoUrl && (
                            <Image style={styles.logo} src={companyDetails.logoUrl} />
                        )}
                        <Text style={styles.companyName}>{companyDetails?.companyName || 'SwiftApp Ecosystem'}</Text>
                        {companyDetails?.brn && (
                            <Text style={styles.companyDetailLine}>BRN: {companyDetails.brn}</Text>
                        )}
                        {companyDetails?.sstNumber && (
                            <Text style={styles.companyDetailLine}>SST No: {companyDetails.sstNumber}</Text>
                        )}
                        <Text style={styles.companyDetailLine}>{companyDetails?.address || '123 Tech Street, Cyberjaya, Malaysia'}</Text>
                        <Text style={styles.companyDetailLine}>Tel: {companyDetails?.contactNo || '+60 123 456 789'}</Text>
                        <Text style={styles.companyDetailLine}>Email: {companyDetails?.email || 'admin@swiftapp.com'}</Text>
                        {companyDetails?.website && (
                            <Text style={styles.companyDetailLine}>Web: {companyDetails.website}</Text>
                        )}
                    </View>

                    <View style={styles.docInfoRight}>
                        <Text style={styles.docTitle}>{type.toUpperCase()}</Text>
                        <View style={styles.docInfoGrid}>
                            <View style={styles.docInfoRow}>
                                <Text style={styles.docInfoLabel}>{type} No.</Text>
                                <Text style={styles.docInfoValue}>{String(data.number || '')}</Text>
                            </View>
                            <View style={styles.docInfoRow}>
                                <Text style={styles.docInfoLabel}>Date</Text>
                                <Text style={styles.docInfoValue}>{new Date().toLocaleDateString('en-MY')}</Text>
                            </View>
                            {type === 'Invoice' && (
                                <View style={styles.docInfoRow}>
                                    <Text style={styles.docInfoLabel}>Terms</Text>
                                    <Text style={styles.docInfoValue}>C.O.D</Text>
                                </View>
                            )}
                            {type === 'Quotation' && data.validUntil && (
                                <View style={styles.docInfoRow}>
                                    <Text style={styles.docInfoLabel}>Valid Until</Text>
                                    <Text style={styles.docInfoValue}>{String(data.validUntil)}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.clientSection}>
                    <View style={styles.clientBlock}>
                        <Text style={styles.sectionLabel}>{type === 'Invoice' ? 'Bill To:' : 'Quotation For:'}</Text>
                        <Text style={styles.clientName}>{String(data.clientName || 'Valued Client')}</Text>
                        {data.clientPhone && (
                            <Text style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>Tel: {String(data.clientPhone)}</Text>
                        )}
                        {data.clientBrn && (
                            <Text style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>BRN: {String(data.clientBrn)}</Text>
                        )}
                        {data.clientEmail && (
                            <Text style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>{String(data.clientEmail)}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                        <Text style={styles.colNo}>No.</Text>
                        <Text style={styles.colDesc}>Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Unit Price (RM)</Text>
                        <Text style={styles.colTotal}>Amount (RM)</Text>
                    </View>

                    {items.map((item, i: number) => (
                        <View style={styles.tableRow} key={i}>
                            <Text style={styles.colNo}>{i + 1}</Text>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{formatMoney(item.unitPrice)}</Text>
                            <Text style={styles.colTotal}>{formatMoney(item.quantity * item.unitPrice)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totalsArea}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>{formatMoney(subtotal)}</Text>
                        </View>
                        {hasSST && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>SST (8%)</Text>
                                <Text style={styles.totalValue}>{formatMoney(sstAmount)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRowFinal}>
                            <Text style={styles.totalLabel}>Grand Total (RM)</Text>
                            <Text style={styles.totalValueFinal}>{formatMoney(grandTotal)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footerContainer}>
                    {showBankDetails && (
                        <View style={styles.bankBox}>
                            <Text style={styles.bankTitle}>Payment Details</Text>
                            {companyDetails?.bankName && (
                                <Text style={styles.bankLine}>Bank: {companyDetails.bankName}</Text>
                            )}
                            {companyDetails?.bankAccount && (
                                <Text style={styles.bankLine}>Account No: {companyDetails.bankAccount}</Text>
                            )}
                            {companyDetails?.bankSwift && (
                                <Text style={styles.bankLine}>SWIFT: {companyDetails.bankSwift}</Text>
                            )}
                        </View>
                    )}

                    <View style={styles.notesBox}>
                        <Text style={styles.notesTitle}>Nota & Syarat</Text>
                        {String(data.notes || '1. Setelah pembayaran diterima, sila hantar bukti pembayaran kepada Adam melalui WhatsApp.')
                            .split('\n')
                            .map((line, i) => (
                                <Text key={i} style={styles.notesLine}>{line}</Text>
                            ))}
                    </View>

                    <View style={styles.signaturesRow}>
                        <View style={styles.signatureBlock}>
                            <View style={styles.signatureLine}></View>
                            <Text style={styles.signatureLabel}>Client Acceptance & Stamp</Text>
                        </View>
                        <View style={styles.signatureBlock}>
                            <View style={styles.signatureLine}></View>
                            <Text style={styles.signatureLabel}>Authorized Signature & Stamp</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};
