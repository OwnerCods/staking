import { FC, ReactNode, useMemo } from 'react';
import { CellProps } from 'react-table';
import styled from 'styled-components';
import { Trans, useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { useRecoilValue } from 'recoil';
import { useRouter } from 'next/router';

import Connector from 'containers/Connector';

import synthetix from 'lib/synthetix';

import { appReadyState } from 'store/app';
import { isWalletConnectedState } from 'store/wallet';

import {
	ExternalLink,
	TableNoResults,
	TableNoResultsTitle,
	TableNoResultsDesc,
	TableNoResultsButtonContainer,
	NoTextTransform,
} from 'styles/common';
import { CryptoBalance } from 'queries/walletBalances/types';

import { EXTERNAL_LINKS } from 'constants/links';
import { Synths } from 'constants/currency';
import ROUTES from 'constants/routes';

import useSelectedPriceCurrency from 'hooks/useSelectedPriceCurrency';

import Table from 'components/Table';
import Currency from 'components/Currency';
import Button from 'components/Button';

import { zeroBN } from 'utils/formatters/number';
import { assetToSynth, isSynth } from 'utils/currencies';

import SynthPriceCol from './components/SynthPriceCol';
import SynthHolding from './components/SynthHolding';

type AssetsTableProps = {
	title: ReactNode;
	assets: CryptoBalance[];
	totalValue: BigNumber;
	isLoading: boolean;
	isLoaded: boolean;
	showConvert: boolean;
	showHoldings: boolean;
};

const AssetsTable: FC<AssetsTableProps> = ({
	assets,
	totalValue,
	isLoading,
	isLoaded,
	title,
	showHoldings,
	showConvert,
}) => {
	const { t } = useTranslation();
	const { connectWallet } = Connector.useContainer();
	const isAppReady = useRecoilValue(appReadyState);
	const isWalletConnected = useRecoilValue(isWalletConnectedState);
	const router = useRouter();

	const { selectedPriceCurrency, selectPriceCurrencyRate } = useSelectedPriceCurrency();

	const assetColumns = useMemo(() => {
		const columns = [
			{
				Header: <>{t('synths.assets.synths.table.asset')}</>,
				accessor: 'currencyKey',
				Cell: (cellProps: CellProps<CryptoBalance, CryptoBalance['currencyKey']>) => {
					const synthDesc =
						synthetix.synthsMap != null ? synthetix.synthsMap[cellProps.value]?.description : '';

					return (
						<Currency.Name
							currencyKey={cellProps.value}
							name={
								isSynth(cellProps.value)
									? t('common.currency.synthetic-currency-name', { currencyName: synthDesc })
									: undefined
							}
							showIcon={true}
						/>
					);
				},

				sortable: true,
				width: 200,
			},
			{
				Header: <>{t('synths.assets.synths.table.balance')}</>,
				accessor: 'usdBalance',
				sortType: 'basic',
				Cell: (cellProps: CellProps<CryptoBalance, CryptoBalance['balance']>) => (
					<Currency.Amount
						currencyKey={cellProps.row.original.currencyKey}
						amount={cellProps.value}
						totalValue={cellProps.row.original.usdBalance}
						sign={selectedPriceCurrency.sign}
						conversionRate={selectPriceCurrencyRate}
					/>
				),
				width: 200,
				sortable: true,
			},
			{
				Header: <>{t('synths.assets.synths.table.price')}</>,
				id: 'price',
				sortType: 'basic',
				Cell: (cellProps: CellProps<CryptoBalance>) => (
					<SynthPriceCol currencyKey={cellProps.row.original.currencyKey} />
				),
				width: 200,
				sortable: false,
			},
		];
		if (showHoldings) {
			columns.push({
				Header: <>{t('synths.assets.synths.table.holdings')}</>,
				id: 'holdings',
				sortType: 'basic',
				Cell: (cellProps: CellProps<CryptoBalance>) => (
					<SynthHolding
						usdBalance={cellProps.row.original.usdBalance}
						totalUSDBalance={totalValue ?? zeroBN}
					/>
				),
				width: 200,
				sortable: false,
			});
		}
		if (showConvert) {
			columns.push({
				Header: <></>,
				accessor: 'holdings',
				sortType: 'basic',
				Cell: ({
					row: {
						original: { currencyKey },
					},
				}: CellProps<CryptoBalance>) => {
					// TODO: this is a very "simple" solution to find a pair to convert
					let synth = assetToSynth(currencyKey);

					// if the synth is not supported, default to sUSD (for 1inch conversation)
					if (!isSynth(synth)) {
						synth = Synths.sUSD;
					}

					return (
						<ExternalLink href={EXTERNAL_LINKS.Trading.OneInchLink(currencyKey, synth)}>
							<ConvertButton variant="secondary">
								<Trans
									i18nKey="common.currency.convert-to-currency"
									values={{
										currencyKey: synth,
									}}
									components={[<NoTextTransform />]}
								/>
							</ConvertButton>
						</ExternalLink>
					);
				},
				width: 200,
				sortable: false,
			});
		}
		return columns;
	}, [
		showHoldings,
		showConvert,
		t,
		totalValue,
		selectPriceCurrencyRate,
		selectedPriceCurrency.sign,
	]);

	return (
		<Container>
			{isWalletConnected && <Header>{title}</Header>}
			<StyledTable
				palette="primary"
				columns={assetColumns}
				data={assets}
				isLoading={isLoading}
				noResultsMessage={
					!isWalletConnected ? (
						<TableNoResults>
							<TableNoResultsTitle>{t('common.wallet.no-wallet-connected')}</TableNoResultsTitle>
							<TableNoResultsButtonContainer>
								<Button variant="primary" onClick={connectWallet}>
									{t('common.wallet.connect-wallet')}
								</Button>
							</TableNoResultsButtonContainer>
						</TableNoResults>
					) : isLoaded && assets.length === 0 ? (
						<TableNoResults>
							<TableNoResultsTitle>
								{t('synths.assets.synths.table.no-synths.title')}
							</TableNoResultsTitle>
							<TableNoResultsDesc>
								{t('synths.assets.synths.table.no-synths.desc')}
							</TableNoResultsDesc>
							<TableNoResultsButtonContainer>
								<Button variant="primary" onClick={() => router.push(ROUTES.Staking.Home)}>
									{t('synths.assets.synths.table.no-synths.button-label')}
								</Button>
							</TableNoResultsButtonContainer>
						</TableNoResults>
					) : undefined
				}
				columnsDeps={[isAppReady, totalValue, selectPriceCurrencyRate]}
				showPagination={true}
			/>
		</Container>
	);
};

const Container = styled.div`
	padding-bottom: 20px;
`;

const StyledTable = styled(Table)`
	.table-body-cell {
		height: 70px;
	}
`;

const Header = styled.div`
	color: ${(props) => props.theme.colors.white};
	font-family: ${(props) => props.theme.fonts.expanded};
	font-size: 16px;
	padding-bottom: 20px;
`;

const ConvertButton = styled(Button)`
	text-transform: uppercase;
	padding-left: 30px;
	padding-right: 30px;
`;

export default AssetsTable;