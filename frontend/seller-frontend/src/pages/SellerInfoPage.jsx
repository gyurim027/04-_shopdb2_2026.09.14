import { useEffect, useState } from 'react'

import {
  getSellerInfo,
  updateSellerProfile,
  updateSellerSettlementAccount,
} from '../services/sellerInfoService'
import './SellerInfoPage.css'

const sellerStatusLabels = {
  ACTIVE: '정상 운영',
  PENDING: '승인 대기',
  SUSPENDED: '운영 중지',
  REJECTED: '승인 거절',
  INACTIVE: '비활성',
}

function SellerInfoPage() {
  const [profile, setProfile] = useState(null)
  const [sellerStatus, setSellerStatus] = useState('')

  const [profileForm, setProfileForm] = useState({
    companyName: '',
    businessNumber: '',
    representativeName: '',
  })

  const [settlementForm, setSettlementForm] = useState({
    settlementBank: '',
    settlementAccount: '',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [isSettlementSaving, setIsSettlementSaving] =
    useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [profileSuccessMessage, setProfileSuccessMessage] =
    useState('')
  const [
    settlementSuccessMessage,
    setSettlementSuccessMessage,
  ] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadSellerInfo() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerInfo()

        if (!isActive) {
          return
        }

        setProfile(data.profile)
        setSellerStatus(data.status.seller_status)

        setProfileForm({
          companyName: data.profile.company_name ?? '',
          businessNumber: data.profile.business_number ?? '',
          representativeName:
            data.profile.representative_name ?? '',
        })

        setSettlementForm({
          settlementBank:
            data.settlementAccount.settlement_bank ?? '',
          settlementAccount:
            data.settlementAccount.settlement_account ?? '',
        })
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadSellerInfo()

    return () => {
      isActive = false
    }
  }, [])

  function handleProfileChange(event) {
    const { name, value } = event.target

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleSettlementChange(event) {
    const { name, value } = event.target

    setSettlementForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setProfileSuccessMessage('')

    if (!profileForm.companyName.trim()) {
      setErrorMessage('상호명을 입력해 주세요.')
      return
    }

    setIsProfileSaving(true)

    try {
      const updatedProfile = await updateSellerProfile({
        company_name: profileForm.companyName.trim(),
        business_number:
          profileForm.businessNumber.trim() || null,
        representative_name:
          profileForm.representativeName.trim() || null,
      })

      setProfile(updatedProfile)
      setProfileSuccessMessage(
        '판매자 프로필이 수정되었습니다.',
      )
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function handleSettlementSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSettlementSuccessMessage('')

    if (
      !settlementForm.settlementBank.trim() ||
      !settlementForm.settlementAccount.trim()
    ) {
      setErrorMessage('정산 은행과 계좌번호를 모두 입력해 주세요.')
      return
    }

    setIsSettlementSaving(true)

    try {
      const updatedAccount =
        await updateSellerSettlementAccount({
          settlement_bank:
            settlementForm.settlementBank.trim(),
          settlement_account:
            settlementForm.settlementAccount.trim(),
        })

      setSettlementForm({
        settlementBank:
          updatedAccount.settlement_bank ?? '',
        settlementAccount:
          updatedAccount.settlement_account ?? '',
      })

      setSettlementSuccessMessage(
        '정산계좌가 수정되었습니다.',
      )
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSettlementSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="seller-info-page">
        <div className="seller-info-loading">
          판매자 정보를 불러오는 중입니다.
        </div>
      </section>
    )
  }

  return (
    <section className="seller-info-page">
      <div className="seller-info-heading">
        <div>
          <h1>내 정보</h1>
          <p>판매자 프로필, 운영 상태와 정산계좌를 관리합니다.</p>
        </div>

        <div
          className={`seller-status-card status-${sellerStatus.toLowerCase()}`}
        >
          <span>판매자 상태</span>
          <strong>
            {sellerStatusLabels[sellerStatus] || sellerStatus}
          </strong>
        </div>
      </div>

      {errorMessage && (
        <div className="seller-info-message is-error" role="alert">
          {errorMessage}
        </div>
      )}

      <section className="seller-info-panel">
        <div className="seller-info-panel-heading">
          <div>
            <h2>계정 정보</h2>
            <p>회원 계정에 등록된 기본 정보입니다.</p>
          </div>
        </div>

        <div className="seller-account-grid">
          <div>
            <span>이름</span>
            <strong>{profile?.user_name || '—'}</strong>
          </div>

          <div>
            <span>이메일</span>
            <strong>{profile?.email || '—'}</strong>
          </div>

          <div>
            <span>전화번호</span>
            <strong>{profile?.phone || '—'}</strong>
          </div>

          <div>
            <span>판매자 ID</span>
            <strong>{profile?.seller_id ?? '—'}</strong>
          </div>
        </div>
      </section>

      <form
        className="seller-info-panel"
        onSubmit={handleProfileSubmit}
      >
        <div className="seller-info-panel-heading">
          <div>
            <h2>판매자 프로필</h2>
            <p>관리자에게 제공되는 사업자 정보입니다.</p>
          </div>
        </div>

        <div className="seller-info-form-grid">
          <label>
            <span>상호명 *</span>
            <input
              type="text"
              name="companyName"
              maxLength="200"
              value={profileForm.companyName}
              onChange={handleProfileChange}
            />
          </label>

          <label>
            <span>사업자등록번호</span>
            <input
              type="text"
              name="businessNumber"
              maxLength="30"
              value={profileForm.businessNumber}
              onChange={handleProfileChange}
            />
          </label>

          <label>
            <span>대표자명</span>
            <input
              type="text"
              name="representativeName"
              maxLength="100"
              value={profileForm.representativeName}
              onChange={handleProfileChange}
            />
          </label>
        </div>

        {profileSuccessMessage && (
          <div className="seller-info-message is-success">
            {profileSuccessMessage}
          </div>
        )}

        <div className="seller-info-form-footer">
          <button
            className="seller-info-save-button"
            type="submit"
            disabled={isProfileSaving}
          >
            {isProfileSaving ? '저장 중' : '프로필 저장'}
          </button>
        </div>
      </form>

      <form
        className="seller-info-panel"
        onSubmit={handleSettlementSubmit}
      >
        <div className="seller-info-panel-heading">
          <div>
            <h2>정산계좌</h2>
            <p>판매대금을 정산받을 계좌 정보입니다.</p>
          </div>
        </div>

        <div className="seller-info-form-grid">
          <label>
            <span>정산 은행 *</span>
            <input
              type="text"
              name="settlementBank"
              maxLength="100"
              value={settlementForm.settlementBank}
              onChange={handleSettlementChange}
              placeholder="예: 신한은행"
            />
          </label>

          <label>
            <span>계좌번호 *</span>
            <input
              type="text"
              name="settlementAccount"
              maxLength="100"
              value={settlementForm.settlementAccount}
              onChange={handleSettlementChange}
              placeholder="숫자와 하이픈을 입력할 수 있습니다."
            />
          </label>
        </div>

        {settlementSuccessMessage && (
          <div className="seller-info-message is-success">
            {settlementSuccessMessage}
          </div>
        )}

        <div className="seller-info-form-footer">
          <button
            className="seller-info-save-button"
            type="submit"
            disabled={isSettlementSaving}
          >
            {isSettlementSaving
              ? '저장 중'
              : '정산계좌 저장'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default SellerInfoPage